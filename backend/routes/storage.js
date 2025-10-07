const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Create storage bucket (admin only)
router.post('/create-bucket', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.storage.createBucket('profile-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (error) {
      console.error('Error creating bucket:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Storage bucket created successfully', data });
  } catch (error) {
    console.error('Error creating storage bucket:', error);
    res.status(500).json({ error: 'Failed to create storage bucket' });
  }
});

// Get bucket info
router.get('/bucket-info', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.storage.getBucket('profile-images');

    if (error) {
      console.error('Error getting bucket info:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    console.error('Error getting bucket info:', error);
    res.status(500).json({ error: 'Failed to get bucket info' });
  }
});

// List files in bucket (admin only)
router.get('/files', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.storage
      .from('profile-images')
      .list('', {
        limit: 100,
        offset: 0
      });

    if (error) {
      console.error('Error listing files:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

module.exports = router;