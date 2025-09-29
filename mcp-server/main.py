#!/usr/bin/env python3
"""
MIVA University AI Education System - Main Launcher
Starts all services in the correct order
"""

import subprocess
import time
import sys
import os

def start_service(name, command, cwd=None):
    """Start a service and return the process"""
    print(f"🚀 Starting {name}...")
    try:
        process = subprocess.Popen(
            command.split(),
            cwd=cwd or os.getcwd(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        time.sleep(2)  # Give service time to start
        if process.poll() is None:
            print(f"✅ {name} started successfully (PID: {process.pid})")
            return process
        else:
            stdout, stderr = process.communicate()
            print(f"❌ {name} failed to start:")
            print(f"   stdout: {stdout.decode()[:200]}")
            print(f"   stderr: {stderr.decode()[:200]}")
            return None
    except Exception as e:
        print(f"❌ Failed to start {name}: {e}")
        return None

def main():
    """Main launcher function"""
    print("🎓 MIVA University AI Education System")
    print("=" * 50)
    
    services = []
    
    # Start MCP Server
    mcp_process = start_service(
        "MCP Academic Server",
        "python3 src/mcp/server_clean.py",
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    if mcp_process:
        services.append(("MCP Server", mcp_process))
    
    # Start Content Processor API  
    api_process = start_service(
        "Enhanced Content Processor API",
        "python3 src/api/enhanced_content_processor_api.py",
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    if api_process:
        services.append(("Content Processor", api_process))
    
    if not services:
        print("❌ No services started successfully!")
        return 1
    
    print("\n🎯 Services Running:")
    for name, process in services:
        print(f"   ✅ {name} (PID: {process.pid})")
    
    print("\n📊 Service Endpoints:")
    print("   🧠 MCP Server: http://localhost:8080")
    print("   ⚡ Content Processor: http://localhost:8082")
    print("   📖 API Docs: http://localhost:8082/docs")
    
    print(f"\n✨ System ready! Press Ctrl+C to stop all services.")
    
    try:
        # Wait for all processes
        while True:
            time.sleep(1)
            # Check if any process died
            for name, process in services:
                if process.poll() is not None:
                    print(f"❌ {name} stopped unexpectedly!")
                    return 1
    except KeyboardInterrupt:
        print("\n🛑 Stopping all services...")
        for name, process in services:
            try:
                process.terminate()
                process.wait(timeout=5)
                print(f"✅ {name} stopped")
            except subprocess.TimeoutExpired:
                process.kill()
                print(f"⚡ {name} force killed")
            except Exception as e:
                print(f"❌ Error stopping {name}: {e}")
        
        print("✅ All services stopped!")
        return 0

if __name__ == "__main__":
    sys.exit(main())