import User from "../models/userModel.js";
import Post from "../models/postModel.js";
import { v2 as cloudinary } from "cloudinary";

export const createPost = async (req, res) => {
    try {
        let { postedBy, text, img } = req.body;

        if (!postedBy || !text) {
            return res.status(400).json({ error: 'Postedby and text is required'});
        }

        const user = await User.findById(postedBy);

        if (!user) {
            return res.status(404).json({ error: 'User not found'});
        }

        if (user._id.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: 'Not authorized'});
        }

        const maxLength = 500;
        if (text.length > maxLength) {
            return res.status(400).json({ error: `Text should be less than ${maxLength} characters`});
        }

        if (img) {
            const uploadedResponse = await cloudinary.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }

        const newPost = new Post({
            postedBy: postedBy,
            text: text,
            img: img
        });
        await newPost.save();
        return res.status(201).json(newPost);

    } catch (error) {
        console.error(error)
        return res.status(404).json({ error: 'Error creating post'});
    }
}

export const getPost = async (req, res) => {
    const { id } = req.params;

    try {
        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found'});
        }
        return res.status(200).json(post);
    } catch (error) {
        console.error(error);
        return res.status(404).json({ error: 'Error fetching post'});
    }
}

export const deletePost = async (req, res) => {
    const { id } = req.params;

    try {
        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found'});
        }

        if (post.postedBy.toString()!== req.user._id.toString()) {
            return res.status(401).json({ error: 'Not authorized'});
        }

        if (post.img) {
            await cloudinary.uploader.destroy(post.img.split("/").pop().split(".")[0]);
        }

        await Post.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Post deleted successfully'});
    } catch (error) {
        console.error(error);
        return res.status(404).json({ error: 'Error deleting post'});
    }
}

export const likeUnlikePost = async (req, res) => {
    const { id: postId } = req.params;
    const userId = req.user._id;

    try {
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found'});
        }

        if (post.likes.includes(userId)) {
            // unlike post
            await Post.findByIdAndUpdate(postId, { $pull: { likes: userId }});
            return res.status(200).json({ message: 'Post unliked successfully'});
        }

        // like post
        await Post.findByIdAndUpdate(postId, { $push: { likes: userId }});
        return res.status(200).json({ message: 'Post liked successfully'});
    } catch (error) {
        console.error(error);
        return res.status(404).json({ error: 'Error liking/unliking post'});
    }
}

export const replyToPost = async (req, res) => {
    try {
        const { id: postId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;
        const userProfilePic = req.user.profilePic;
        const userName = req.user.username;

        if (!text) {
            return res.status(400).json({ error: 'Text is required'});
        }

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found'});
        }

        const reply = { userId, text, userProfilePic, userName };
        post.replies.push(reply);
        await post.save();

        res.status(200).json(reply);

    } catch (error) {
        console.error(error);
        return res.status(404).json({ error: 'Error replying to post'});
    }
}

export const getFeedPosts = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: 'User not found'});
        }

        const posts = await Post.find({ postedBy: { $in: user.following }}).sort({ createdAt: -1 });
        return res.status(200).json(posts);
    } catch (error) {
        console.error(error);
        return res.status(404).json({ error: 'Error fetching posts'});
    }
}

export const getUserPosts = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ error: 'User not found'});
        }

        const posts = await Post.find({ postedBy: user._id }).sort({ createdAt: -1 });
        return res.status(200).json(posts);
    } catch (error) {
        console.error(error);
        return res.status(404).json({ error: 'Error fetching posts'});
    }
}