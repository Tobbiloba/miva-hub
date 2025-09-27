#!/usr/bin/env python3
"""
Test Enhanced Semantic Search with Complete COS202 Dataset
Comprehensive testing of AI-powered search across all processed materials
"""

import asyncio
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
from ai_integration import MIVAAIStack

# Load environment variables
load_dotenv()

def print_header(title):
    """Print formatted section header"""
    print(f"\n{'='*80}")
    print(f"🔍 {title}")
    print(f"{'='*80}")

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

async def test_search_query(ai_stack, query, similarity_threshold=0.3, limit=5):
    """Test a single search query"""
    print_info(f"Searching for: '{query}'")
    
    # Generate query embedding
    query_result = await ai_stack.generate_embeddings(query)
    if not query_result['success']:
        print_error(f"Failed to generate query embedding: {query_result['error']}")
        return []
    
    # Search database
    conn = get_database_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        
        # Use semantic search function
        cursor.execute("""
            SELECT * FROM semantic_search(%s::vector, 'COS202', %s, %s)
        """, (query_result['embedding'], similarity_threshold, limit))
        
        results = cursor.fetchall()
        
        if results:
            print_success(f"Found {len(results)} relevant results:")
            for i, result in enumerate(results, 1):
                print_info(f"  {i}. {result['material_title']} (similarity: {result['similarity_score']:.3f})")
                print_info(f"     Content: {result['chunk_text'][:120]}...")
                print_info(f"     Material type: {result['material_type']}")
        else:
            print_info("No results found")
        
        cursor.close()
        conn.close()
        return results
        
    except Exception as e:
        print_error(f"Search failed: {e}")
        conn.close()
        return []

async def get_dataset_overview():
    """Get overview of processed dataset"""
    print_header("Dataset Overview")
    
    conn = get_database_connection()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # Get total counts
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT cm.id) as total_materials,
                COUNT(DISTINCT apc.id) as processed_materials,
                COUNT(ce.id) as total_embeddings,
                COUNT(DISTINCT cm.week_number) as weeks_covered
            FROM course_materials cm
            JOIN courses c ON cm.course_id = c.id
            LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
            LEFT JOIN content_embeddings ce ON cm.id = ce.course_material_id
            WHERE c.course_code = 'COS202'
        """)
        
        overview = cursor.fetchone()
        print_success(f"Total COS202 materials: {overview['total_materials']}")
        print_success(f"AI processed materials: {overview['processed_materials']}")
        print_success(f"Content embeddings: {overview['total_embeddings']}")
        print_success(f"Weeks covered: {overview['weeks_covered']}")
        
        # Get material type breakdown
        cursor.execute("""
            SELECT 
                cm.material_type,
                COUNT(*) as count,
                COUNT(apc.id) as processed_count
            FROM course_materials cm
            JOIN courses c ON cm.course_id = c.id
            LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
            WHERE c.course_code = 'COS202'
            GROUP BY cm.material_type
            ORDER BY count DESC
        """)
        
        print_info("\nMaterial type breakdown:")
        for row in cursor.fetchall():
            print_info(f"  • {row['material_type']}: {row['processed_count']}/{row['count']} processed")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print_error(f"Failed to get overview: {e}")
        conn.close()

async def test_comprehensive_search():
    """Test comprehensive search scenarios"""
    print_header("Comprehensive Search Testing")
    
    ai_stack = MIVAAIStack()
    
    if not await ai_stack.test_connection():
        print_error("AI stack not available")
        return
    
    # Test queries covering different topics and weeks
    test_queries = [
        # Core programming concepts
        "What is inheritance and polymorphism?",
        "How to implement class hierarchies?",
        "Exception handling in C++",
        "Recursive algorithms and applications",
        "Event-driven programming concepts",
        
        # Specific techniques
        "GUI programming in C++",
        "Search algorithms implementation",
        "Sorting techniques and methods",
        "Iterator and enumerator patterns",
        "MVC architecture design",
        
        # Advanced topics
        "Advanced OOP techniques",
        "Interactive application development",
        "Project development best practices",
        "Algorithm complexity analysis",
        "Software design patterns",
        
        # Week-specific content
        "Week 1 programming foundations",
        "Week 5 sorting algorithms",
        "Week 9 GUI development",
        "Week 12 project development"
    ]
    
    print_info(f"Testing {len(test_queries)} diverse search queries...")
    
    all_results = []
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n--- Query {i}/{len(test_queries)} ---")
        results = await test_search_query(ai_stack, query, similarity_threshold=0.3, limit=3)
        all_results.extend(results)
        
        # Small delay to prevent overwhelming the system
        await asyncio.sleep(0.5)
    
    # Analyze search performance
    print_header("Search Performance Analysis")
    
    if all_results:
        similarity_scores = [r['similarity_score'] for r in all_results]
        avg_similarity = sum(similarity_scores) / len(similarity_scores)
        max_similarity = max(similarity_scores)
        min_similarity = min(similarity_scores)
        
        print_success(f"Total search results: {len(all_results)}")
        print_success(f"Average similarity score: {avg_similarity:.3f}")
        print_success(f"Best match score: {max_similarity:.3f}")
        print_success(f"Lowest match score: {min_similarity:.3f}")
        
        # Count unique materials found
        unique_materials = set(r['course_material_id'] for r in all_results)
        print_success(f"Unique materials found: {len(unique_materials)}")
        
        # Material type distribution in results
        material_types = {}
        for result in all_results:
            material_type = result['material_type']
            material_types[material_type] = material_types.get(material_type, 0) + 1
        
        print_info("\nMaterial types in search results:")
        for material_type, count in sorted(material_types.items()):
            print_info(f"  • {material_type}: {count} results")
    
    else:
        print_error("No search results found across all queries")

async def test_specific_scenarios():
    """Test specific search scenarios"""
    print_header("Specific Scenario Testing")
    
    ai_stack = MIVAAIStack()
    
    # Test high-threshold search for precise matching
    print_info("Testing high-precision search (threshold 0.6)...")
    await test_search_query(ai_stack, "GUI programming in C++", similarity_threshold=0.6, limit=5)
    
    # Test low-threshold search for broad matching
    print_info("\nTesting broad search (threshold 0.2)...")
    await test_search_query(ai_stack, "programming", similarity_threshold=0.2, limit=8)
    
    # Test week-specific search
    print_info("\nTesting week-specific content search...")
    await test_search_query(ai_stack, "Week 8 exception handling", similarity_threshold=0.3, limit=5)

async def main():
    """Main test execution"""
    print_header("Enhanced Semantic Search Testing with Complete COS202 Dataset")
    
    # Get dataset overview
    await get_dataset_overview()
    
    # Test comprehensive search
    await test_comprehensive_search()
    
    # Test specific scenarios
    await test_specific_scenarios()
    
    print_header("Testing Complete!")
    print_success("🎉 Enhanced semantic search testing completed successfully!")
    print_info("The AI study buddy is ready with intelligent search across all COS202 content!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print_error("\nTesting cancelled by user")
    except Exception as e:
        print_error(f"Testing failed: {e}")
        import traceback
        traceback.print_exc()