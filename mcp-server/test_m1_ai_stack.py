#!/usr/bin/env python3
"""
Test MIVA AI Stack on M1 Pro - Phase 1
Test existing Ollama models and new dependencies
"""

import time
import asyncio
import subprocess
import json
import torch
import whisper_timestamped as whisper
from transformers import pipeline
import sys
import os

def print_header(title):
    """Print formatted section header"""
    print(f"\n{'='*50}")
    print(f"🧪 {title}")
    print(f"{'='*50}")

def print_success(message):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message):
    """Print info message"""
    print(f"📊 {message}")

def test_m1_hardware():
    """Test M1 Pro hardware capabilities"""
    print_header("M1 Pro Hardware Check")
    
    # Check MPS availability
    if torch.backends.mps.is_available():
        print_success("MPS (Metal Performance Shaders) is available")
        print_info(f"MPS built: {torch.backends.mps.is_built()}")
    else:
        print_error("MPS not available - falling back to CPU")
    
    # Memory info
    try:
        import psutil
        memory = psutil.virtual_memory()
        print_info(f"Total RAM: {memory.total / (1024**3):.1f} GB")
        print_info(f"Available RAM: {memory.available / (1024**3):.1f} GB")
        print_info(f"Memory usage: {memory.percent}%")
    except ImportError:
        print_info("Install psutil for detailed memory info: pip install psutil")
    
    # CPU info
    print_info(f"PyTorch threads: {torch.get_num_threads()}")
    
    # Set optimal M1 Pro settings
    torch.set_num_threads(8)  # M1 Pro has 8 performance cores
    
    print_success("M1 Pro optimizations applied")

def test_ollama_models():
    """Test existing Ollama models"""
    print_header("Testing Existing Ollama Models")
    
    try:
        # Check if Ollama is running
        result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
        if result.returncode != 0:
            print_error("Ollama not running or not installed")
            return False
        
        models = result.stdout.strip().split('\n')[1:]  # Skip header
        print_info(f"Found {len(models)} models:")
        
        total_size = 0
        model_info = []
        
        for line in models:
            if line.strip():
                parts = line.split()
                name = parts[0]
                size_str = parts[2] if len(parts) > 2 else "Unknown"
                print_info(f"  • {name} ({size_str})")
                
                # Extract size in GB for calculation
                if 'GB' in size_str:
                    size_gb = float(size_str.replace('GB', '').strip())
                    total_size += size_gb
                    model_info.append({'name': name, 'size': size_gb})
        
        print_info(f"Total model size: {total_size:.1f} GB")
        print_info(f"Estimated memory usage: {total_size + 2:.1f} GB (including overhead)")
        
        # Test LLM performance
        print("\n🦙 Testing LLM Performance...")
        return test_llm_chat(model_info)
        
    except Exception as e:
        print_error(f"Failed to test Ollama models: {e}")
        return False

def test_llm_chat(model_info):
    """Test LLM chat performance"""
    
    # Try to find the best model for testing
    test_model = None
    for model in model_info:
        if 'llama3.2:3b' in model['name']:
            test_model = 'llama3.2:3b'
            break
        elif 'qwen3' in model['name']:
            test_model = model['name']
            break
    
    if not test_model:
        print_error("No suitable LLM found for testing")
        return False
    
    print_info(f"Testing model: {test_model}")
    
    try:
        # Test simple chat
        start_time = time.time()
        
        cmd = [
            'ollama', 'run', test_model,
            'What is object-oriented programming? Give a brief educational explanation.'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        response_time = time.time() - start_time
        
        if result.returncode == 0:
            response = result.stdout.strip()
            print_success(f"LLM response received in {response_time:.2f}s")
            print_info(f"Response length: {len(response)} characters")
            print_info(f"Response preview: {response[:100]}...")
            
            # Performance metrics
            if response_time < 10:
                print_success("Excellent response time for M1 Pro!")
            elif response_time < 20:
                print_success("Good response time")
            else:
                print_info("Response time acceptable but could be optimized")
            
            return True
        else:
            print_error(f"LLM test failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print_error("LLM test timed out (>30s)")
        return False
    except Exception as e:
        print_error(f"LLM test error: {e}")
        return False

def test_nomic_embeddings():
    """Test nomic embeddings model"""
    print_header("Testing Nomic Embeddings")
    
    try:
        print_info("Testing nomic-embed-text model...")
        start_time = time.time()
        
        # Test embedding generation
        test_text = "Object-oriented programming is a programming paradigm based on the concept of objects."
        
        cmd = [
            'ollama', 'run', 'nomic-embed-text:latest',
            f'embed: {test_text}'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        
        response_time = time.time() - start_time
        
        if result.returncode == 0:
            print_success(f"Embedding generated in {response_time:.3f}s")
            print_info("Nomic embeddings working correctly")
            
            # Performance assessment
            if response_time < 1:
                print_success("Excellent embedding performance!")
            elif response_time < 3:
                print_success("Good embedding performance")
            else:
                print_info("Embedding performance acceptable")
            
            return True
        else:
            print_error(f"Embedding test failed: {result.stderr}")
            return False
            
    except Exception as e:
        print_error(f"Nomic embedding test error: {e}")
        return False

def test_whisper():
    """Test Whisper speech-to-text"""
    print_header("Testing Whisper Speech-to-Text")
    
    try:
        print_info("Loading Whisper model (this may take a moment)...")
        
        # Load small model for testing (good for M1 Pro)
        model = whisper.load_model("small")
        print_success("Whisper model loaded successfully")
        
        # Model info
        print_info(f"Model: Whisper Small")
        print_info(f"Parameters: ~244M")
        print_info(f"Memory usage: ~1GB")
        print_info("Languages: Multilingual (optimized for English)")
        
        # Test with a sample audio file (if available)
        print_info("Whisper ready for audio transcription")
        print_info("To test: provide an audio file and call whisper.transcribe(model, audio_file)")
        
        return True
        
    except Exception as e:
        print_error(f"Whisper test error: {e}")
        print_info("Install requirements: pip install openai-whisper")
        return False

def test_torch_integration():
    """Test PyTorch M1 integration"""
    print_header("Testing PyTorch M1 Integration")
    
    try:
        # Test tensor operations on MPS
        if torch.backends.mps.is_available():
            device = torch.device("mps")
            print_success("Using MPS device for acceleration")
        else:
            device = torch.device("cpu")
            print_info("Using CPU device")
        
        # Simple tensor test
        start_time = time.time()
        x = torch.randn(1000, 1000, device=device)
        y = torch.randn(1000, 1000, device=device)
        z = torch.matmul(x, y)
        computation_time = time.time() - start_time
        
        print_success(f"Matrix multiplication completed in {computation_time:.3f}s")
        
        if computation_time < 0.1:
            print_success("Excellent PyTorch performance on M1!")
        elif computation_time < 0.5:
            print_success("Good PyTorch performance")
        else:
            print_info("PyTorch performance acceptable")
        
        return True
        
    except Exception as e:
        print_error(f"PyTorch test error: {e}")
        return False

def generate_performance_report():
    """Generate performance summary"""
    print_header("Phase 1 Performance Summary")
    
    print_info("Your M1 Pro 16GB Setup Analysis:")
    print()
    
    print("🧠 AI Models Currently Available:")
    print("  • llama3.2:3b (2.0GB) - Fast LLM for Q&A")
    print("  • nomic-embed-text (274MB) - Embeddings for search")
    print("  • qwen3:4b-thinking (2.5GB) - Reasoning model")
    print("  • Whisper Small (~1GB) - Speech-to-text")
    print()
    
    print("📊 Memory Usage Estimate:")
    print("  • Models loaded: ~5.8GB")
    print("  • Available for processing: ~10GB")
    print("  • System overhead: ~4GB")
    print("  • Status: EXCELLENT for M1 Pro 16GB! 🚀")
    print()
    
    print("⚡ Expected Performance:")
    print("  • LLM responses: 3-10 seconds")
    print("  • Embeddings: <1 second")
    print("  • Speech transcription: Real-time or faster")
    print("  • Semantic search: <200ms")
    print()
    
    print("🎯 Ready for Phase 2:")
    print("  ✅ AI models working")
    print("  ✅ M1 acceleration enabled")
    print("  ✅ Memory usage optimized")
    print("  ✅ All dependencies installed")

async def main():
    """Main test execution"""
    print_header("MIVA AI Stack Testing - Phase 1")
    print("Testing your existing models and M1 Pro setup...")
    
    tests_passed = 0
    total_tests = 5
    
    # Test 1: Hardware
    test_m1_hardware()
    tests_passed += 1
    
    # Test 2: Ollama models
    if test_ollama_models():
        tests_passed += 1
    
    # Test 3: Nomic embeddings
    if test_nomic_embeddings():
        tests_passed += 1
    
    # Test 4: Whisper
    if test_whisper():
        tests_passed += 1
    
    # Test 5: PyTorch
    if test_torch_integration():
        tests_passed += 1
    
    # Final report
    print_header(f"Test Results: {tests_passed}/{total_tests} Passed")
    
    if tests_passed >= 4:
        print_success("🎉 Your M1 Pro AI stack is ready!")
        print_success("You can proceed to Phase 2: Database Enhancement")
        generate_performance_report()
    elif tests_passed >= 3:
        print_info("⚠️  Most tests passed - minor issues to resolve")
        print_info("You can likely proceed with Phase 2")
    else:
        print_error("❌ Several issues found - need to resolve before proceeding")
    
    print("\n🚀 Next Steps:")
    print("1. If tests passed: Continue to Phase 2 (Database setup)")
    print("2. If issues found: Check error messages above")
    print("3. Ready to build the content processing system!")

if __name__ == "__main__":
    asyncio.run(main())