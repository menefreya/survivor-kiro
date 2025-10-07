import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Image upload service
export const uploadProfileImage = async (file, userId, currentImageUrl = null) => {
  try {
    // Delete existing image if it exists
    if (currentImageUrl) {
      await deleteExistingProfileImage(currentImageUrl);
    }

    // Create a consistent filename (will replace existing)
    const fileExt = file.name.split('.').pop();
    const fileName = `profile-${userId}.${fileExt}`;
    const filePath = `profile-images/${fileName}`;

    // Upload file to Supabase storage (upsert: true will replace existing)
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // This will replace existing files with the same name
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    return {
      path: data.path,
      publicUrl: publicUrl
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Helper function to delete existing profile image
const deleteExistingProfileImage = async (imageUrl) => {
  try {
    // Extract the file path from the URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `profile-images/${fileName}`;

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath]);

    if (error) {
      console.warn('Could not delete existing image:', error);
      // Don't throw error - continue with upload
    }
  } catch (error) {
    console.warn('Error deleting existing image:', error);
    // Don't throw error - continue with upload
  }
};

// Delete old profile image
export const deleteProfileImage = async (imagePath) => {
  try {
    const { error } = await supabase.storage
      .from('profile-images')
      .remove([imagePath]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw error for deletion failures - it's not critical
  }
};