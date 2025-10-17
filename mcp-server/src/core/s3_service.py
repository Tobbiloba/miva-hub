"""
AWS S3 Service for MIVA University Content Processing
Handles secure file downloads from S3 for AI processing
"""

import os
import tempfile
import logging
from typing import Optional, Tuple
from pathlib import Path
from dotenv import load_dotenv

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.config import Config

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class S3Service:
    """AWS S3 service for downloading course materials for processing."""
    
    def __init__(self):
        """Initialize S3 client with credentials from environment."""
        self.region = os.getenv('AWS_REGION', 'us-east-1')
        self.bucket_name = os.getenv('AWS_S3_BUCKET', 'miva-university-content')
        
        # Configure S3 client with same settings as frontend
        config = Config(
            region_name=self.region,
            retries={'max_attempts': 3, 'mode': 'adaptive'},
            max_pool_connections=50
        )
        
        try:
            self.s3_client = boto3.client(
                's3',
                region_name=self.region,
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                config=config
            )
            logger.info(f"S3 client initialized for region {self.region}, bucket {self.bucket_name}")
        except NoCredentialsError:
            logger.error("AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            raise
    
    def download_file_to_temp(self, s3_key: str) -> Tuple[str, str]:
        """
        Download a file from S3 to a temporary location.
        
        Args:
            s3_key: The S3 object key (path within bucket)
            
        Returns:
            Tuple of (temp_file_path, original_filename)
            
        Raises:
            ClientError: If S3 download fails
            FileNotFoundError: If file doesn't exist in S3
        """
        try:
            # Extract original filename from S3 key
            original_filename = Path(s3_key).name
            file_extension = Path(original_filename).suffix
            
            # Create temporary file with same extension
            temp_file = tempfile.NamedTemporaryFile(
                delete=False, 
                suffix=file_extension,
                prefix='miva_content_'
            )
            temp_file_path = temp_file.name
            temp_file.close()
            
            logger.info(f"Downloading S3 object: s3://{self.bucket_name}/{s3_key}")
            
            # Download file from S3
            self.s3_client.download_file(
                Bucket=self.bucket_name,
                Key=s3_key,
                Filename=temp_file_path
            )
            
            # Verify file was downloaded and has content
            if not os.path.exists(temp_file_path) or os.path.getsize(temp_file_path) == 0:
                raise ValueError(f"Downloaded file is empty or missing: {temp_file_path}")
            
            file_size = os.path.getsize(temp_file_path)
            logger.info(f"Successfully downloaded {original_filename} ({file_size} bytes) to {temp_file_path}")
            
            return temp_file_path, original_filename
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                logger.error(f"File not found in S3: s3://{self.bucket_name}/{s3_key}")
                raise FileNotFoundError(f"File not found in S3: {s3_key}")
            elif error_code == 'NoSuchBucket':
                logger.error(f"S3 bucket not found: {self.bucket_name}")
                raise FileNotFoundError(f"S3 bucket not found: {self.bucket_name}")
            else:
                logger.error(f"S3 download failed: {e}")
                raise
        except Exception as e:
            logger.error(f"Unexpected error downloading from S3: {e}")
            # Clean up temp file if it was created
            if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            raise
    
    def cleanup_temp_file(self, temp_file_path: str) -> None:
        """
        Safely remove a temporary file.
        
        Args:
            temp_file_path: Path to temporary file to remove
        """
        try:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                logger.info(f"Cleaned up temporary file: {temp_file_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup temporary file {temp_file_path}: {e}")
    
    def get_file_metadata(self, s3_key: str) -> dict:
        """
        Get metadata for an S3 object without downloading it.
        
        Args:
            s3_key: The S3 object key
            
        Returns:
            Dictionary with file metadata
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            return {
                'size': response.get('ContentLength', 0),
                'last_modified': response.get('LastModified'),
                'content_type': response.get('ContentType'),
                'metadata': response.get('Metadata', {}),
                'etag': response.get('ETag', '').strip('"')
            }
        except ClientError as e:
            logger.error(f"Failed to get S3 metadata for {s3_key}: {e}")
            raise
    
    def file_exists(self, s3_key: str) -> bool:
        """
        Check if a file exists in S3.
        
        Args:
            s3_key: The S3 object key
            
        Returns:
            True if file exists, False otherwise
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return False
            raise
    
    def health_check(self) -> bool:
        """
        Verify S3 service is accessible.
        
        Returns:
            True if S3 is accessible, False otherwise
        """
        try:
            # Try to list objects in bucket (limit to 1 for efficiency)
            self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                MaxKeys=1
            )
            return True
        except Exception as e:
            logger.error(f"S3 health check failed: {e}")
            return False


# Singleton instance for use across the application
s3_service = S3Service()