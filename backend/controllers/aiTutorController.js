const AIInteraction = require('../models/aiInteractionModel');

// @desc    Query the AI tutor
// @route   POST /api/ai/query
// @access  Private (Student)
exports.queryAITutor = async (req, res) => {
    try {
        const { courseId, query } = req.body;

        if (!query || query.trim() === '') {
            return res.status(400).json({ message: 'Query cannot be empty' });
        }

        // Store the interaction
        const interaction = await AIInteraction.create({
            user: req.user._id,
            course: courseId,
            query,
            response: generateAIResponse(query),
            timestamp: new Date()
        });

        res.status(201).json(interaction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get AI interaction history
// @route   GET /api/ai/history?courseId=:courseId
// @access  Private (Student)
exports.getAIHistory = async (req, res) => {
    try {
        const { courseId } = req.query;
        const query = courseId 
            ? { user: req.user._id, course: courseId }
            : { user: req.user._id };

        const interactions = await AIInteraction.find(query)
            .populate('course', 'title')
            .sort('-timestamp');

        res.json(interactions);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get a single AI interaction
// @route   GET /api/ai/:id
// @access  Private (Student)
exports.getAIInteraction = async (req, res) => {
    try {
        const interaction = await AIInteraction.findById(req.params.id)
            .populate('course');

        if (!interaction) {
            return res.status(404).json({ message: 'Interaction not found' });
        }

        // Check authorization
        if (interaction.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view this interaction' });
        }

        res.json(interaction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete AI interaction
// @route   DELETE /api/ai/:id
// @access  Private (Student/Admin)
exports.deleteAIInteraction = async (req, res) => {
    try {
        const interaction = await AIInteraction.findById(req.params.id);

        if (!interaction) {
            return res.status(404).json({ message: 'Interaction not found' });
        }

        // Check authorization
        if (interaction.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await AIInteraction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Interaction deleted' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Simple AI response generator (placeholder for OpenAI/LangChain integration)
function generateAIResponse(query) {
    const responses = {
        'what is': 'In education, we use technology to help understand concepts better. Your question is great! Let me help you understand this better.',
        'how do i': 'Here are the steps to accomplish this: First, understand the fundamentals. Then, practice with examples. Finally, apply your knowledge.',
        'explain': 'A great question! Let me break this down into simpler parts so it\'s easier to understand. This concept is fundamental to learning.',
        'default': 'That\'s a thoughtful question! To better answer you, could you provide more context about what you\'re trying to learn?'
    };

    const queryLower = query.toLowerCase();
    
    for (const key in responses) {
        if (key !== 'default' && queryLower.includes(key)) {
            return responses[key];
        }
    }

    return responses.default;
}
