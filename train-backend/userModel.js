import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    resetCode: { 
        type: String, 
        default: null,
        select: false 
    },
    resetCodeExpires: { 
        type: Date, 
        default: null,
        select: false 
    },
    favorites: [mongoose.Schema.Types.Mixed]
});

export default mongoose.model('User', userSchema);