import { chromium, FullConfig } from '@playwright/test';
import { join } from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Initialize test database via API endpoint
    const baseURL = config.projects?.[0]?.use?.baseURL || 'http://localhost:4200';
    const apiURL = baseURL.replace(':4200', ':8000');
    
    console.log('📊 Initializing test database...');
    
    // Try to connect to the backend server with retries
    let response;
    let retries = 10;
    let lastError;
    
    while (retries > 0) {
      try {
        response = await fetch(`${apiURL}/api/test/reset-database/`, {
          method: 'POST'
        });
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          console.log(`⏳ Backend server not ready, retrying in 2 seconds... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'No response';
      throw new Error(`Failed to initialize test database: ${response?.status || 'No response'} - ${errorText}`);
    }
    
    console.log('✅ Test database initialized');
    
    // Setup authentication states for all test users
    console.log('🔐 Setting up authentication states...');
    await setupAuthStates(config);
    
    console.log('✅ Global setup complete');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function setupAuthStates(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Get base URL from config
  const baseURL = config.projects?.[0]?.use?.baseURL || 'http://localhost:4200';
  
  const testUsers = [
    { key: 'admin', username: 'admin', password: 'admin' },
    { key: 'mariacarter', username: 'mariacarter', password: 'mariacarter' },
    { key: 'bencarter', username: 'bencarter', password: 'bencarter' },
    { key: 'sofiarossi', username: 'sofiarossi', password: 'sofiarossi' },
    { key: 'leoschmidt', username: 'leoschmidt', password: 'leoschmidt' },
    { key: 'kenjitanaka', username: 'kenjitanaka', password: 'kenjitanaka' }
  ];
  
  // Check if frontend is available
  try {
    const loginURL = `${baseURL}/login`;
    await page.goto(loginURL, { timeout: 5000 });
  } catch (error) {
    console.log('⚠️  Frontend server not available during global setup, skipping auth state creation');
    console.log('   Auth states will be created during individual test runs');
    await browser.close();
    return;
  }
  
  for (const user of testUsers) {
    try {
      console.log(`🔑 Setting up auth state for ${user.username}...`);
      
      // Navigate to login page with full URL
      const loginURL = `${baseURL}/login`;
      await page.goto(loginURL);
      
      // Fill login form
      await page.fill('[data-testid="username-input"]', user.username);
      await page.fill('[data-testid="password-input"]', user.password);
      
      // Submit login
      await page.click('[data-testid="login-submit-button"]');
      
      // Wait for successful login (redirect away from login page)
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
      
      // Save storage state
      const authDir = join(__dirname, '.auth');
      await page.context().storageState({ path: join(authDir, `${user.key}.json`) });
      
      console.log(`✅ Auth state saved for ${user.username}`);
      
      // Clear storage for next user
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
    } catch (error) {
      console.error(`❌ Failed to setup auth state for ${user.username}:`, error);
      throw error;
    }
  }
  
  await browser.close();
}

export default globalSetup;
