// featureFlagController.js
const FeatureFlag = require('../models/featureFlagModel');

exports.getFlag = async (req, res) => {
  try {
    const { key } = req.params;
    let flag = await FeatureFlag.findOne({ key });
    // Auto-create if doesn't exist with default value
    if (!flag) {
      flag = await FeatureFlag.create({ key, value: false });
    }
    res.json({ key: flag.key, value: flag.value });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.setFlag = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    let flag = await FeatureFlag.findOne({ key });
    if (!flag) {
      flag = new FeatureFlag({ key, value, updatedBy: req.user._id });
    } else {
      flag.value = value;
      flag.updatedBy = req.user._id;
    }
    await flag.save();
    res.json(flag);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.listFlags = async (req, res) => {
  try {
    const flags = await FeatureFlag.find({});
    res.json(flags);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
