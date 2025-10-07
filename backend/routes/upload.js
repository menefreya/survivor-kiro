const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { authenticateToken } = require('../middleware/auth');

// Test endpoint to check if route is working
router.get('/test', (req, res) => {
  res.json({ message: 'Upload route is working' });
});

// Test Supabase storage connection
router.get('/test-storage', authenticateToken, async (req, res) => {
  try {
    // Check if bucket exists
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('profile-images');
    
    if (bucketError) {
      console.log('Bucket error:', bucketError);
      return res.json({ 
        message: 'Bucket does not exist', 
        error: bucketError.message,
        needsCreation: true 
      });
    }
    
    res.json({ 
      message: 'Storage connection working', 
      bucket: bucketData,
      needsCreation: false 
    });
  } catch (error) {
    console.error('Storage test error:', error);
    res.status(500).json({ error: error.message });
  }
});
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Simple test endpoint without multer
router.post('/profile-image-test', authenticateToken, async (req, res) => {
  res.json({ message: 'Authentication working', user: req.user });
});

// Upload profile image endpoint
router.post('/profile-image', authenticateToken, (req, res, next) => {
  console.log('Before multer - Content-Type:', req.headers['content-type']);
  console.log('Before multer - Body:', req.body);
  next();
}, upload.single('image'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('User:', req.user);
    console.log('File:', req.file);
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    console.log('Content-Type:', req.headers['content-type']);
    
    if (!req.file) {
      console.log('No file in request');
      console.log('Available fields:', Object.keys(req.body || {}));
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;
    const file = req.file;
    
    console.log('Processing upload for user:', userId);
    
    // Create filename with timestamp to avoid caching issues
    const fileExt = file.originalname.split('.').pop();
    const timestamp = Date.now();
    const fileName = `profile-${userId}-${timestamp}.${fileExt}`;
    const filePath = fileName; // Store in root of bucket, not subfolder
    
    console.log('Uploading to Supabase storage:', filePath);

    // Ensure bucket exists (create if needed)
    try {
      const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('profile-images');
      
      if (bucketError && bucketError.message.includes('not found')) {
        console.log('Bucket does not exist, creating...');
        const { data: createData, error: createError } = await supabase.storage.createBucket('profile-images', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
          console.error('Failed to create bucket:', createError);
          return res.status(400).json({ 
            error: 'Failed to create storage bucket', 
            details: createError.message 
          });
        }
        console.log('Bucket created successfully:', createData);
      }
    } catch (bucketCheckError) {
      console.log('Bucket check warning:', bucketCheckError.message);
    }

    // Delete existing images for this user (cleanup old files)
    try {
      const { data: existingFiles } = await supabase.storage
        .from('profile-images')
        .list('', {
          search: `profile-${userId}`
        });
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => f.name);
        await supabase.storage
          .from('profile-images')
          .remove(filesToDelete);
        console.log('Cleaned up old files:', filesToDelete);
      }
    } catch (deleteError) {
      console.log('Cleanup warning (non-critical):', deleteError.message);
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
      return res.status(400).json({ 
        error: 'Failed to upload to storage', 
        details: uploadError.message,
        errorCode: uploadError.error || uploadError.statusCode,
        fullError: uploadError
      });
    }

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('Public URL:', publicUrl);

    // Update user profile in database
    const { error: updateError } = await supabase
      .from('players')
      .update({ profile_image_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(400).json({ error: 'Failed to update profile' });
    }

    res.json({ 
      message: 'Profile image uploaded successfully to Supabase',
      publicUrl: publicUrl,
      path: filePath
    });

  } catch (error) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Upload middleware error:', error);
  res.status(500).json({ error: 'Upload failed' });
});

module.exports = router;