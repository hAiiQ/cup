// Script to add force-dynamic to all API routes
const fs = require('fs');
const path = require('path');

function addForceDynamicToFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already has dynamic export
  if (content.includes('export const dynamic')) {
    console.log(`⏭️  Skipping ${filePath} - already has dynamic export`);
    return;
  }
  
  // Check if it has API route exports
  if (!content.includes('export async function')) {
    console.log(`⏭️  Skipping ${filePath} - no API functions found`);
    return;
  }
  
  // Find the first import statement or export statement
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find where to insert (after imports, before exports)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('export async function') || lines[i].startsWith('export function')) {
      insertIndex = i;
      break;
    }
  }
  
  // Insert the dynamic export
  lines.splice(insertIndex, 0, '', '// Force dynamic rendering', 'export const dynamic = \'force-dynamic\'', '');
  
  const newContent = lines.join('\n');
  fs.writeFileSync(filePath, newContent);
  console.log(`✅ Added force-dynamic to ${filePath}`);
}

function findApiRoutes(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findApiRoutes(fullPath);
    } else if (file === 'route.ts' || file === 'route.js') {
      addForceDynamicToFile(fullPath);
    }
  });
}

// Start from the API directory
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
console.log('🔄 Adding force-dynamic to all API routes...');
findApiRoutes(apiDir);
console.log('✅ Done!');
