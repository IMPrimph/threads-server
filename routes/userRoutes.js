import express from 'express';
import { signUpUser, loginUser, logoutUser, suggestedUsers, freezeAccount, followUnFollowUser, updateUser, userProfile } from '../controllers/userController.js';
import { protectRoute } from '../middlewares/protectRoute.js';

const router = express.Router();

router.get('/profile/:query', userProfile);
router.get('/suggested', protectRoute, suggestedUsers);
router.post('/signup', signUpUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/follow/:id', protectRoute, followUnFollowUser); // toggle follow and unfollow users
router.put('/update/:id', protectRoute, updateUser);
router.put('/freeze', protectRoute, freezeAccount);

export default router;
