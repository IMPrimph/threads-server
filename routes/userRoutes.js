import express from 'express';
import { signUpUser, loginUser, logoutUser, followUnFollowUser, updateUser, userProfile } from '../controllers/userController.js';
import { protectRoute } from '../middlewares/protectRoute.js';

const router = express.Router();

router.get('/profile/:username', userProfile);
router.post('/signup', signUpUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/follow/:id', protectRoute, followUnFollowUser); // toggle follow and unfollow users
router.post('/update/:id', protectRoute, updateUser);

export default router;