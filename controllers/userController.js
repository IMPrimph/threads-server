import User from "../models/userModel.js";
import Post from "../models/postModel.js";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../utils/helpers/genTokenAndSetCookie.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

export const signUpUser = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await new User({
      name,
      email,
      username,
      password: hashedPassword,
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
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ error: "Invalid user data" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (user.isFrozen) {
      user.isFrozen = false;
      await user.save();
    }

    generateTokenAndSetCookie(user._id, res);
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 1 });
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

export const followUnFollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const otherUser = await User.findById(id);

    if (!otherUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (currentUser._id.toString() === otherUser._id.toString()) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      // unfollow user
      // modify current user follow
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });
      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
      return res.status(200).json({ message: "User Unfollowed successfully" });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
      return res.status(200).json({ message: "User Followed Successfully" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  let { name, email, username, password, profilePic, bio } = req.body;
  const userId = req.user._id;

  try {
    let user = await User.findById(userId);
    if (!user) return res.status(400).json({ error: "User not found" });

    if (req.params.id !== userId.toString()) {
      return res
        .status(401)
        .json({ error: "Not authorized to update others profile" });
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user.password = hashedPassword;
    }

    if (profilePic) {
      if (user.profilePic) {
        await cloudinary.uploader.destroy(
          user.profilePic.split("/").pop().split(".")[0],
        );
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

    // find all the posts user replied and update their profilePic and username
    await Post.updateMany(
      {"replies.userId": userId},
      {
        $set: {
          "replies.$[reply].userProfilePic": user.profilePic,
          "replies.$[reply].userName": user.username,
        }
      },
      {
        arrayFilters: [{ "reply.userId": userId }]
      }
    )

    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

export const userProfile = async (req, res) => {
  // get user by id or name
  try {
    const { query } = req.params;

    let user;

    if (mongoose.Types.ObjectId.isValid(query)) {
      user = await User.findOne({ _id: query })
        .select("-password")
        .select("-updatedAt")
        .select("-__v");
    } else {
      user = await User.findOne({ username: query })
        .select("-password")
        .select("-updatedAt")
        .select("-__v");
    }

    if (!user) return res.status(400).json({ error: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

export const suggestedUsers = async (req, res) => {
	try {
		// exclude the current user from suggested users array and exclude users that current user is already following
		const userId = req.user._id;

		const usersFollowedByYou = await User.findById(userId).select("following");

		const users = await User.aggregate([
			{
				$match: {
					_id: { $ne: userId },
				},
			},
			{
				$sample: { size: 10 },
			},
		]);
		const filteredUsers = users.filter((user) => !usersFollowedByYou.following.includes(user._id));
		const suggestedUsers = filteredUsers.slice(0, 4);

		suggestedUsers.forEach((user) => (user.password = null));

		res.status(200).json(suggestedUsers);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const freezeAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.isFrozen = true;
    await user.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
}