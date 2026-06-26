import mongoose from 'mongoose';

const TranslationSchema = new mongoose.Schema({
  text: { type: String, required: true },
  lang: { type: String, required: true },
  translation: { type: String, required: true }
}, { timestamps: true, versionKey: false });

TranslationSchema.index({ text: 1, lang: 1 }, { unique: true });

export default mongoose.model('Translation', TranslationSchema);
