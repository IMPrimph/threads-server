import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import generateTokenAndSetCookie from '../utils/helpers/genTokenAndSetCookie.js';
import { v2 as cloudinary } from 'cloudinary';

export const signUpUser = async (req, res) => {
    try {
        const { name, email, username, password } = req.body;
        const existingUser = await User.findOne({$or: [{ email}, {username}] });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await new User({
            name,
            email,
            username,
            password: hashedPassword
        });
        await newUser.save();

        if (newUser) {
            generateTokenAndSetCookie(newUser._id, res);
            res.status(201).json({
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                username: newUser.username,
                bio: newUser.bio,
                profilePic: newUser.profilePic
            });
        } else {
            res.status(400).json({ error: 'Invalid user data' });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message });
    }
}

export const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        generateTokenAndSetCookie(user._id, res);
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            bio: user.bio,
            profilePic: user.profilePic
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message });
    }
}

export const logoutUser = async (req, res) => {
    try {
        res.cookie('jwt', '', { maxAge: 1 });
        res.status(200).json({ message: 'Logged out' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message });
    }
}

export const followUnFollowUser = async (req, res) => {
    try {
        const { id } = req.params;
        const otherUser = await User.findById(id);

        if (!otherUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentUser = await User.findById(req.user._id);

        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (currentUser._id.toString() === otherUser._id.toString()) {
            return res.status(400).json({ error: 'You cannot follow yourself' });
        }

        const isFollowing = currentUser.following.includes(id);

        if (isFollowing) {
            // unfollow user
            // modify current user follow
            await User.findByIdAndUpdate(req.user._id, {$pull: { following: id }});
            await User.findByIdAndUpdate(id, {$pull: { followers: req.user._id}});
            return res.status(200).json({ message: "User Unfollowed successfully" });
        } else {
            await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
            await User.findByIdAndUpdate(id, {$push: { followers: req.user._id}});
            return res.status(200).json({ message: "User Followed Successfully" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message });
    }
}

export const updateUser = async (req, res) => {
    let { name, email, username, password, profilePic, bio } = req.body;
    const userId = req.user._id;

    try {
        let user = await User.findById(userId);
        if (!user) return res.status(400).json({ error: "User not found" });

        if (req.params.id !== userId.toString()) {
            return res.status(401).json({ error: "Not authorized to update others profile" });
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            user.password =  hashedPassword;
        }

        if (profilePic) {
            if (user.profilePic) {
                await cloudinary.uploader.destroy(user.profilePic.split('/').pop().split(".")[0]);
            }
            const uploadedResponse = await cloudinary.uploader.upload(profilePic);
            profilePic = uploadedResponse.secure_url;
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.username = username || user.username;
        user.profilePic = profilePic || user.profilePic;
        user.bio = bio || user.bio;

        const savedUser = await user.save();
        user = savedUser.toObject();
        delete user.password;
        return res.status(200).json(user);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message });
    }
}

export const userProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username: username}).select("-password").select("-updatedAt").select("-__v");
        if (!user) return res.status(400).json({ error: "User not found" });
        return res.status(200).json(user);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message });
    }
}