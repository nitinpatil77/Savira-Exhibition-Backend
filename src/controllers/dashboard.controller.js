import Enquiry from '../models/Enquiry.js';
import { buildFilter } from './enquiry.controller.js';
import { DEMO_TIMELINES, PRODUCTS, STATUSES } from '../utils/constants.js';

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

const isConverted = { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] };

/**
 * Post-exhibition report: totals, pipeline by status, product-wise interest and
 * conversion, day-wise enquiries, demo timelines and top locations.
 * Optional query: from / to (YYYY-MM-DD).
 */
export async function getReport(req, res) {
  const match = buildFilter({ from: req.query.from, to: req.query.to });

  const [result] = await Enquiry.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              converted: { $sum: isConverted },
              demoRequested: { $sum: { $cond: ['$interestedInDemo', 1, 0] } },
              demoRequestedConverted: {
                $sum: { $cond: [{ $and: ['$interestedInDemo', { $eq: ['$status', 'Converted'] }] }, 1, 0] },
              },
            },
          },
        ],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byProduct: [
          { $unwind: '$interestedProducts' },
          { $group: { _id: '$interestedProducts', count: { $sum: 1 }, converted: { $sum: isConverted } } },
        ],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: process.env.TZ } },
              count: { $sum: 1 },
              converted: { $sum: isConverted },
            },
          },
          { $sort: { _id: 1 } },
        ],
        byTimeline: [{ $match: { interestedInDemo: true } }, { $group: { _id: '$demoTimeline', count: { $sum: 1 } } }],
        byLocation: [
          { $group: { _id: { $toLower: { $trim: { input: '$companyLocation' } } }, label: { $first: '$companyLocation' }, count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  const totals = result.totals[0] || { total: 0, converted: 0, demoRequested: 0, demoRequestedConverted: 0 };
  const statusCount = Object.fromEntries(result.byStatus.map((s) => [s._id, s.count]));
  const productStats = new Map(result.byProduct.map((p) => [p._id, p]));
  const timelineCount = Object.fromEntries(result.byTimeline.map((t) => [t._id || 'Not specified', t.count]));

  // Every current product is listed (zeros included); older product names found in data are kept too.
  const productNames = [...new Set([...PRODUCTS, ...productStats.keys()])];

  res.json({
    totals: {
      total: totals.total,
      followedUp: totals.total - (statusCount.New || 0),
      demoPlanned: statusCount['Demo Planned'] || 0,
      trialPlanned: statusCount['Trial Planned'] || 0,
      converted: totals.converted,
      closed: statusCount.Closed || 0,
      demoRequested: totals.demoRequested,
      demoRequestedConverted: totals.demoRequestedConverted,
    },
    byStatus: STATUSES.map((status) => ({ label: status, count: statusCount[status] || 0 })),
    byProduct: productNames
      .map((name) => ({ label: name, count: productStats.get(name)?.count || 0, converted: productStats.get(name)?.converted || 0 }))
      .sort((a, b) => b.count - a.count || b.converted - a.converted),
    byDay: result.byDay.map((d) => ({ date: d._id, count: d.count, converted: d.converted })),
    byTimeline: [...DEMO_TIMELINES, 'Not specified']
      .map((timeline) => ({ label: timeline, count: timelineCount[timeline] || 0 }))
      .filter((t) => t.label !== 'Not specified' || t.count),
    byLocation: result.byLocation.map((l) => ({ label: l.label.trim(), count: l.count })),
  });
}
