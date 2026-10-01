import Enquiry from '../models/Enquiry.js';

export async function getStats(_req, res) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [total, today, demoRequests, newEnquiries] = await Promise.all([
    Enquiry.countDocuments(),
    Enquiry.countDocuments({ createdAt: { $gte: startOfToday } }),
    Enquiry.countDocuments({ interestedInDemo: true }),
    Enquiry.countDocuments({ status: 'New' }),
  ]);

  res.json({ total, today, demoRequests, newEnquiries });
}
