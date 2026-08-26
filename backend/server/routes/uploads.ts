import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { uploadImageBuffer } from '../lib/cloudinary';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});

router.post('/', (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    try {
      const url = await uploadImageBuffer(req.file.buffer, 'cps-delivery/pod');
      res.json({ url });
    } catch (uploadErr) {
      const message = uploadErr instanceof Error ? uploadErr.message : 'Upload failed';
      res.status(503).json({ error: message });
    }
  });
});

export default router;
