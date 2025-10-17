// Video utility functions for S3 URL conversion and video detection

/**
 * Convert S3 URL to streaming endpoint URL
 */
export function convertVideoUrl(s3Url: string): string {
  if (s3Url.startsWith('s3://')) {
    return `/api/files/stream?url=${encodeURIComponent(s3Url)}`;
  }
  return s3Url; // Already HTTP/HTTPS
}

/**
 * Check if a URL points to a video file
 */
export function isVideoUrl(url: string): boolean {
  console.log('        🔗 isVideoUrl checking:', url);
  
  if (!url) {
    console.log('        ❌ Empty URL');
    return false;
  }
  
  // Check for video extensions, handling query parameters
  const isVideo = /\.(mp4|avi|mov|webm|mkv)(\?.*)?$/i.test(url);
  console.log('        - Result:', isVideo ? '✅ HAS VIDEO EXTENSION' : '❌ NO VIDEO EXTENSION');
  
  return isVideo;
}

/**
 * Check if a material object contains a video
 */
export function isVideoMaterial(material: any): boolean {
  console.log('    🎬 isVideoMaterial checking:', material);
  
  if (!material) {
    console.log('      ❌ Material is null/undefined');
    return false;
  }
  
  if (!material.file_url) {
    console.log('      ❌ No file_url property');
    console.log('      - Material keys:', Object.keys(material));
    return false;
  }
  
  console.log('      - file_url:', material.file_url);
  console.log('      - title:', material.title);
  console.log('      - material_type:', material.material_type);
  
  // Check if URL has video extension
  const hasVideoUrl = isVideoUrl(material.file_url);
  console.log('      - hasVideoUrl:', hasVideoUrl);
  
  if (hasVideoUrl) {
    console.log('      ✅ MATCH: Video URL detected');
    return true;
  }
  
  // Check if title indicates it's a video
  const hasVideoTitle = material.title && /video/i.test(material.title);
  console.log('      - hasVideoTitle:', hasVideoTitle);
  
  if (hasVideoTitle) {
    console.log('      ✅ MATCH: Video title detected');
    return true;
  }
  
  // Check if material type indicates it's a video
  const hasVideoType = material.material_type && /video/i.test(material.material_type);
  console.log('      - hasVideoType:', hasVideoType);
  
  if (hasVideoType) {
    console.log('      ✅ MATCH: Video type detected');
    return true;
  }
  
  console.log('      ❌ NO MATCH: Not a video material');
  return false;
}

/**
 * Extract video file extension from URL
 */
export function getVideoExtension(url: string): string {
  const match = url.match(/\.([^/.]+)$/);
  return match ? match[1].toUpperCase() : 'VIDEO';
}

/**
 * Generate a clean display name from video material
 */
export function getVideoDisplayName(material: any): string {
  if (material.title && material.title !== '' && material.title !== 'Introductory video') {
    return material.title;
  }
  
  // Extract filename from file_url
  const filename = material.file_url?.split('/').pop()?.split('?')[0] || '';
  if (filename && filename !== material.file_url) {
    // Remove file extension and format nicely
    return filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
  }
  
  return material.title || 'Video Content';
}

/**
 * Check if a material object contains a PDF
 */
export function isPDFMaterial(material: any): boolean {
  console.log('    📄 isPDFMaterial checking:', material);
  
  if (!material?.file_url) {
    console.log('      ❌ No file_url property');
    return false;
  }
  
  const isPDF = /\.pdf$/i.test(material.file_url);
  console.log('      - isPDF:', isPDF ? '✅ IS PDF' : '❌ NOT PDF');
  return isPDF;
}

/**
 * Check if a material object contains a document
 */
export function isDocumentMaterial(material: any): boolean {
  console.log('    📝 isDocumentMaterial checking:', material);
  
  if (!material?.file_url) {
    console.log('      ❌ No file_url property');
    return false;
  }
  
  const isDoc = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt)$/i.test(material.file_url);
  console.log('      - isDocument:', isDoc ? '✅ IS DOCUMENT' : '❌ NOT DOCUMENT');
  return isDoc;
}

/**
 * Check if a material is any rich content type (video, PDF, document)
 */
export function isRichMaterial(material: any): boolean {
  return isVideoMaterial(material) || isPDFMaterial(material) || isDocumentMaterial(material);
}

/**
 * Extract all rich materials (videos, PDFs, documents) from tool response data
 */
export function extractRichMaterials(toolOutput: any): any[] {
  console.log('🎨 extractRichMaterials: checking multiple data paths');
  console.log('  - toolOutput type:', typeof toolOutput);
  console.log('  - toolOutput keys:', toolOutput ? Object.keys(toolOutput) : 'null');
  
  if (!toolOutput) {
    console.log('  ❌ No toolOutput provided');
    return [];
  }
  
  // Path 1: structuredContent.result (cleanest, parsed JSON)
  if (toolOutput?.structuredContent?.result) {
    console.log('  🔍 Checking Path 1: structuredContent.result');
    try {
      const parsed = JSON.parse(toolOutput.structuredContent.result);
      console.log('    - parsed structuredContent:', parsed);
      if (parsed?.materials?.length) {
        console.log('    ✅ Found materials in structuredContent.result:', parsed.materials.length, 'items');
        const richMaterials = parsed.materials.filter((material, index) => {
          console.log('    🔍 Checking material #' + index + ':', material);
          const isRich = isRichMaterial(material);
          console.log('    - Result for #' + index + ':', isRich ? '✅ IS RICH CONTENT' : '❌ NOT RICH CONTENT');
          return isRich;
        });
        console.log('    📊 Path 1 result:', richMaterials.length, 'rich materials found');
        return richMaterials;
      }
    } catch (e) {
      console.log('    ❌ Failed to parse structuredContent.result:', e);
    }
  }
  
  // Path 2: MCP format content[0].text.materials (where our data actually is)
  if (toolOutput?.content?.[0]?.text?.materials?.length) {
    console.log('  🔍 Checking Path 2: content[0].text.materials');
    const materials = toolOutput.content[0].text.materials;
    console.log('    ✅ Found materials in content[0].text.materials:', materials.length, 'items');
    console.log('    - materials:', materials);
    
    const richMaterials = materials.filter((material, index) => {
      console.log('    🔍 Checking material #' + index + ':', material);
      const isRich = isRichMaterial(material);
      console.log('    - Result for #' + index + ':', isRich ? '✅ IS RICH CONTENT' : '❌ NOT RICH CONTENT');
      return isRich;
    });
    
    console.log('    📊 Path 2 result:', richMaterials.length, 'rich materials found');
    console.log('    - rich materials:', richMaterials);
    return richMaterials;
  }
  
  // Path 3: Direct materials (original expectation)
  if (toolOutput?.materials?.length) {
    console.log('  🔍 Checking Path 3: direct .materials property');
    console.log('    ✅ Found materials in direct .materials property:', toolOutput.materials.length, 'items');
    
    const richMaterials = toolOutput.materials.filter((material, index) => {
      console.log('    🔍 Checking material #' + index + ':', material);
      const isRich = isRichMaterial(material);
      console.log('    - Result for #' + index + ':', isRich ? '✅ IS RICH CONTENT' : '❌ NOT RICH CONTENT');
      return isRich;
    });
    
    console.log('    📊 Path 3 result:', richMaterials.length, 'rich materials found');
    return richMaterials;
  }
  
  console.log('  ❌ No materials found in any known path');
  console.log('  - Available paths checked:');
  console.log('    1. structuredContent.result:', !!toolOutput?.structuredContent?.result);
  console.log('    2. content[0].text.materials:', !!toolOutput?.content?.[0]?.text?.materials);
  console.log('    3. direct materials:', !!toolOutput?.materials);
  
  return [];
}

/**
 * Extract video materials from tool response data
 * @deprecated Use extractRichMaterials() instead
 */
export function extractVideoMaterials(toolOutput: any): any[] {
  console.log('🎥 extractVideoMaterials: checking multiple data paths');
  console.log('  - toolOutput type:', typeof toolOutput);
  console.log('  - toolOutput keys:', toolOutput ? Object.keys(toolOutput) : 'null');
  
  if (!toolOutput) {
    console.log('  ❌ No toolOutput provided');
    return [];
  }
  
  // Path 1: structuredContent.result (cleanest, parsed JSON)
  if (toolOutput?.structuredContent?.result) {
    console.log('  🔍 Checking Path 1: structuredContent.result');
    try {
      const parsed = JSON.parse(toolOutput.structuredContent.result);
      console.log('    - parsed structuredContent:', parsed);
      if (parsed?.materials?.length) {
        console.log('    ✅ Found materials in structuredContent.result:', parsed.materials.length, 'items');
        const videos = parsed.materials.filter((material, index) => {
          console.log('    🔍 Checking material #' + index + ':', material);
          const isVideo = isVideoMaterial(material);
          console.log('    - Result for #' + index + ':', isVideo ? '✅ IS VIDEO' : '❌ NOT VIDEO');
          return isVideo;
        });
        console.log('    📊 Path 1 result:', videos.length, 'videos found');
        return videos;
      }
    } catch (e) {
      console.log('    ❌ Failed to parse structuredContent.result:', e);
    }
  }
  
  // Path 2: MCP format content[0].text.materials (where our data actually is)
  if (toolOutput?.content?.[0]?.text?.materials?.length) {
    console.log('  🔍 Checking Path 2: content[0].text.materials');
    const materials = toolOutput.content[0].text.materials;
    console.log('    ✅ Found materials in content[0].text.materials:', materials.length, 'items');
    console.log('    - materials:', materials);
    
    const videos = materials.filter((material, index) => {
      console.log('    🔍 Checking material #' + index + ':', material);
      const isVideo = isVideoMaterial(material);
      console.log('    - Result for #' + index + ':', isVideo ? '✅ IS VIDEO' : '❌ NOT VIDEO');
      return isVideo;
    });
    
    console.log('    📊 Path 2 result:', videos.length, 'videos found');
    console.log('    - videos:', videos);
    return videos;
  }
  
  // Path 3: Direct materials (original expectation)
  if (toolOutput?.materials?.length) {
    console.log('  🔍 Checking Path 3: direct .materials property');
    console.log('    ✅ Found materials in direct .materials property:', toolOutput.materials.length, 'items');
    
    const videos = toolOutput.materials.filter((material, index) => {
      console.log('    🔍 Checking material #' + index + ':', material);
      const isVideo = isVideoMaterial(material);
      console.log('    - Result for #' + index + ':', isVideo ? '✅ IS VIDEO' : '❌ NOT VIDEO');
      return isVideo;
    });
    
    console.log('    📊 Path 3 result:', videos.length, 'videos found');
    return videos;
  }
  
  console.log('  ❌ No materials found in any known path');
  console.log('  - Available paths checked:');
  console.log('    1. structuredContent.result:', !!toolOutput?.structuredContent?.result);
  console.log('    2. content[0].text.materials:', !!toolOutput?.content?.[0]?.text?.materials);
  console.log('    3. direct materials:', !!toolOutput?.materials);
  
  return [];
}

/**
 * Format upload date for display
 */
export function formatVideoDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}