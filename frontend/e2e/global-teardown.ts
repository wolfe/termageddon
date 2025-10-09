import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Optional: Clean up any test artifacts
    console.log('📝 Logging test completion...');
    
    // Could add cleanup logic here if needed
    // For example: cleaning up uploaded files, clearing caches, etc.
    
    console.log('✅ Global teardown complete');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;
