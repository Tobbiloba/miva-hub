#!/usr/bin/env python3
"""
Test AI Content Processing with Real COS202 Data
Process existing course materials and test semantic search
"""

import asyncio
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import sys
import os
from dotenv import load_dotenv
from ai_integration import MIVAAIStack
import numpy as np

# Load environment variables
load_dotenv()

def print_header(title):
    """Print formatted section header"""
    print(f"\n{'='*60}")
    print(f"🧪 {title}")
    print(f"{'='*60}")

def print_success(message):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message):
    """Print info message"""
    print(f"📊 {message}")

def get_database_connection():
    """Get database connection"""
    try:
        config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', '5432')),
            'database': os.getenv('DB_NAME', 'miva_academic'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', ''),
            'cursor_factory': RealDictCursor
        }
        
        conn = psycopg2.connect(**config)
        return conn
    except Exception as e:
        print_error(f"Database connection failed: {e}")
        return None

async def get_sample_course_materials():
    """Get sample course materials for processing"""
    print_header("Getting Sample Course Materials")
    
    conn = get_database_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        
        # Get COS202 course materials for testing
        cursor.execute("""
            SELECT cm.*, c.course_code, c.course_name
            FROM course_materials cm
            JOIN courses c ON cm.course_id = c.id  
            WHERE c.course_code = 'COS202'
            AND cm.material_type IN ('pdf', 'video')
            LIMIT 3
        """)
        
        materials = cursor.fetchall()
        
        print_success(f"Found {len(materials)} materials for processing:")
        for material in materials:
            print_info(f"  • {material['title']} ({material['material_type']})")
        
        cursor.close()
        conn.close()
        return materials
        
    except Exception as e:
        print_error(f"Failed to get materials: {e}")
        conn.close()
        return []

async def process_material_with_ai(material, ai_stack):
    """Process a single course material with AI"""
    print_info(f"Processing: {material['title']}")
    
    # Simulate content extraction (in real implementation, this would extract from actual files)
    if material['material_type'] == 'pdf':
        # Simulate PDF content
        sample_content = f"""
        {material['title']}
        
        This document covers advanced object-oriented programming concepts for Week {material['week_number']}.
        
        Key topics include:
        - Class hierarchies and inheritance
        - Polymorphism and method overriding  
        - Encapsulation principles
        - Abstract classes and interfaces
        
        Learning objectives:
        1. Understand inheritance relationships
        2. Implement polymorphic behavior
        3. Apply encapsulation best practices
        4. Design class hierarchies effectively
        
        This material is designed for intermediate to advanced students who have
        completed basic programming courses. The concepts build upon foundational
        knowledge of classes and objects.
        """
    elif material['material_type'] == 'video':
        # Simulate video transcript
        sample_content = f"""
        {material['title']} - Video Transcript
        
        Welcome to this video on {material['title']}.
        
        In today's lesson, we'll explore advanced programming concepts that are essential
        for building robust software applications.
        
        First, let's discuss inheritance. Inheritance is a fundamental concept in 
        object-oriented programming that allows classes to inherit properties and
        methods from parent classes.
        
        Next, we'll cover polymorphism, which enables objects of different types
        to be treated as instances of the same type through inheritance.
        
        Finally, we'll look at practical examples of implementing these concepts
        in real-world programming scenarios.
        
        By the end of this video, you should be able to:
        - Define inheritance and polymorphism
        - Implement these concepts in your code
        - Understand when and how to use these techniques
        """
    else:
        sample_content = f"Content for {material['title']}"
    
    # Generate AI analysis
    analysis_result = await ai_stack.analyze_content(sample_content, material['material_type'])
    
    if not analysis_result['success']:
        print_error(f"AI analysis failed: {analysis_result['error']}")
        return None
    
    # Generate embeddings for content chunks
    chunks = create_content_chunks(sample_content)
    embeddings = []
    
    print_info(f"Generating embeddings for {len(chunks)} chunks...")
    
    for chunk in chunks:
        emb_result = await ai_stack.generate_embeddings(chunk)
        if emb_result['success']:
            embeddings.append(emb_result['embedding'])
        else:
            print_error(f"Embedding generation failed: {emb_result['error']}")
            return None
    
    # Extract parsed analysis
    parsed = analysis_result.get('parsed', {})
    
    processed_data = {
        'material_id': material['id'],
        'extracted_text': sample_content,
        'summary': parsed.get('summary', analysis_result['response'][:500]),
        'key_concepts': parsed.get('topics', []),
        'learning_objectives': parsed.get('objectives', []),
        'difficulty_level': parsed.get('difficulty', 'intermediate'),
        'chunks': chunks,
        'embeddings': embeddings,
        'ai_model': 'llama3.2:3b',
        'embedding_model': 'nomic-embed-text'
    }
    
    print_success(f"AI processing completed for: {material['title']}")
    return processed_data

def create_content_chunks(text, chunk_size=300, overlap=50):
    """Create overlapping text chunks"""
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        if len(chunk.strip()) > 50:  # Only meaningful chunks
            chunks.append(chunk)
    
    return chunks

async def store_processed_content(processed_data):
    """Store processed content in database"""
    print_info(f"Storing AI-processed content...")
    
    conn = get_database_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Insert into ai_processed_content
        cursor.execute("""
            INSERT INTO ai_processed_content 
            (course_material_id, processing_status, extracted_text, ai_summary, 
             key_concepts, learning_objectives, difficulty_level, word_count,
             estimated_reading_time, ai_model_used, embedding_model_used)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            processed_data['material_id'],
            'completed',
            processed_data['extracted_text'],
            processed_data['summary'],
            processed_data['key_concepts'],
            processed_data['learning_objectives'],
            processed_data['difficulty_level'],
            len(processed_data['extracted_text'].split()),
            max(1, len(processed_data['extracted_text'].split()) // 200),  # Rough reading time
            processed_data['ai_model'],
            processed_data['embedding_model']
        ))
        
        ai_content_id = cursor.fetchone()['id']
        
        # Insert embeddings
        for i, (chunk, embedding) in enumerate(zip(processed_data['chunks'], processed_data['embeddings'])):
            cursor.execute("""
                INSERT INTO content_embeddings 
                (course_material_id, ai_processed_id, chunk_text, chunk_index, embedding, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                processed_data['material_id'],
                ai_content_id,
                chunk,
                i,
                embedding,  # pgvector will handle the conversion
                json.dumps({
                    'material_type': 'content',
                    'chunk_size': len(chunk.split()),
                    'ai_model': processed_data['ai_model']
                })
            ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print_success(f"Stored content with {len(processed_data['chunks'])} embedding chunks")
        return True
        
    except Exception as e:
        print_error(f"Failed to store content: {e}")
        conn.rollback()
        conn.close()
        return False

async def test_semantic_search():
    """Test semantic search functionality"""
    print_header("Testing Semantic Search")
    
    ai_stack = MIVAAIStack()
    
    # Test queries
    test_queries = [
        "What is inheritance in programming?",
        "How do you implement polymorphism?", 
        "Object-oriented programming concepts",
        "Class hierarchies and design"
    ]
    
    for query in test_queries:
        print_info(f"Searching for: '{query}'")
        
        # Generate query embedding
        query_result = await ai_stack.generate_embeddings(query)
        if not query_result['success']:
            print_error(f"Failed to generate query embedding: {query_result['error']}")
            continue
        
        # Search database
        conn = get_database_connection()
        if not conn:
            continue
        
        try:
            cursor = conn.cursor()
            
            # Use the semantic_search function we created
            cursor.execute("""
                SELECT * FROM semantic_search(%s::vector, 'COS202', 0.3, 3)
            """, (query_result['embedding'],))
            
            results = cursor.fetchall()
            
            if results:
                print_success(f"Found {len(results)} relevant results:")
                for result in results:
                    print_info(f"  • {result['material_title']} (similarity: {result['similarity_score']:.3f})")
                    print_info(f"    Content: {result['chunk_text'][:100]}...")
            else:
                print_info("No results found (this is normal if no content processed yet)")
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            print_error(f"Search failed: {e}")
            conn.close()

async def main():
    """Main test execution"""
    print_header("AI Content Processing Integration Test")
    print_info("Testing complete AI pipeline with real COS202 data")
    
    # Initialize AI stack
    print_info("Initializing AI stack...")
    ai_stack = MIVAAIStack()
    
    if not await ai_stack.test_connection():
        print_error("AI stack not available")
        return
    
    # Get sample materials
    materials = await get_sample_course_materials()
    if not materials:
        print_error("No materials found for processing")
        return
    
    # Process materials with AI
    processed_count = 0
    for material in materials:
        processed_data = await process_material_with_ai(material, ai_stack)
        if processed_data:
            if await store_processed_content(processed_data):
                processed_count += 1
        
        # Limit to 2 materials for testing
        if processed_count >= 2:
            break
    
    print_success(f"Successfully processed {processed_count} materials")
    
    if processed_count > 0:
        # Test semantic search
        await test_semantic_search()
        
        # Show final status
        print_header("Final Status Check")
        
        conn = get_database_connection()
        if conn:
            cursor = conn.cursor()
            
            # Check processed content
            cursor.execute("SELECT COUNT(*) as count FROM ai_processed_content")
            ai_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM content_embeddings") 
            embedding_count = cursor.fetchone()['count']
            
            cursor.close()
            conn.close()
            
            print_success(f"AI processed content: {ai_count}")
            print_success(f"Content embeddings: {embedding_count}")
            print_success("🎉 Phase 2 Complete - Database AI integration successful!")
        
    else:
        print_error("No content was processed successfully")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print_error("\nTest cancelled by user")
    except Exception as e:
        print_error(f"Test failed: {e}")
        import traceback
        traceback.print_exc()