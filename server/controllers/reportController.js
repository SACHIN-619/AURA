import Salon from '../models/Salon.js';

// User submits a manual report
export const submitReport = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { reason, details } = req.body;
    const userId = req.user ? req.user.id : null;

    const salon = await Salon.findById(salonId);
    if (!salon) return res.status(404).json({ success: false, error: 'Salon not found' });

    salon.reports.push({
      user: userId,
      reason,
      details,
      status: 'pending'
    });

    await salon.save();
    return res.json({ success: true, message: 'Report submitted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Admin gets all pending reports
export const getPendingReports = async (req, res) => {
  try {
    const salonsWithReports = await Salon.find({ 'reports.status': 'pending' })
      .select('name hub reports')
      .populate('reports.user', 'name email');

    let allReports = [];
    salonsWithReports.forEach(salon => {
      salon.reports.forEach(report => {
        if (report.status === 'pending') {
          allReports.push({
            salonId: salon._id,
            salonName: salon.name,
            salonHub: salon.hub,
            reportId: report._id,
            user: report.user,
            reason: report.reason,
            details: report.details,
            createdAt: report.createdAt
          });
        }
      });
    });

    return res.json({ success: true, reports: allReports });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Admin resolves/dismisses a report
export const updateReportStatus = async (req, res) => {
  try {
    const { salonId, reportId } = req.params;
    const { status } = req.body; // 'resolved' or 'dismissed'

    const salon = await Salon.findById(salonId);
    if (!salon) return res.status(404).json({ success: false, error: 'Salon not found' });

    const report = salon.reports.id(reportId);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

    report.status = status;
    await salon.save();

    return res.json({ success: true, message: `Report marked as ${status}` });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
