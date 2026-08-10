import ActionItem from '../models/ActionItem.js';

export const getActionItems = async (req, res) => {
  try {
    const actionItems = await ActionItem.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(actionItems);
  } catch (err) {
    console.error('Error fetching action items:', err);
    res.status(500).send('Server error');
  }
};

export const getActionItemsByMeeting = async (req, res) => {
  try {
    const actionItems = await ActionItem.find({ 
      meetingId: req.params.meetingId,
      userId: req.user.id 
    }).sort({ createdAt: 1 });
    res.json(actionItems);
  } catch (err) {
    console.error('Error fetching action items for meeting:', err);
    res.status(500).send('Server error');
  }
};

export const updateActionItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    let actionItem = await ActionItem.findById(req.params.id);
    
    if (!actionItem) return res.status(404).json({ message: 'Action item not found' });
    
    if (actionItem.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    actionItem.status = status;
    await actionItem.save();

    res.json(actionItem);
  } catch (err) {
    console.error('Error updating action item status:', err);
    res.status(500).send('Server error');
  }
};
