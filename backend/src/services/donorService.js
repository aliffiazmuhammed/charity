import { Donation } from '../models/Donation.js';

/**
 * Get a full donor profile by phone number.
 * Returns: name, phone, totalDonated, donationCount, firstDate, lastDate, history[]
 */
export const getDonorProfile = async (phone) => {
  const donations = await Donation.find({ phone })
    .sort({ date: -1 })
    .lean();

  if (donations.length === 0) {
    return null;
  }

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
  const dates = donations.map((d) => new Date(d.date).getTime());

  return {
    donorName: donations[0].donorName,
    phone,
    totalDonated,
    donationCount: donations.length,
    firstDate: new Date(Math.min(...dates)),
    lastDate: new Date(Math.max(...dates)),
    history: donations,
  };
};

export const getAllDonors = async ({ search, page = 1, limit = 10, sortBy = 'totalDonated', sortOrder = 'desc' }) => {
  const pipeline = [];

  // Match search query
  if (search && search.trim().length > 0) {
    const regex = new RegExp(search.trim(), 'i');
    pipeline.push({
      $match: {
        $or: [
          { donorName: { $regex: regex } },
          { phone: { $regex: regex } },
        ],
      },
    });
  }

  // Define sort for aggregation
  const sortObj = {};
  sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

  pipeline.push(
    { $sort: { date: -1 } }, // Needed so $first grabs the latest donor name
    {
      $group: {
        _id: '$phone',
        donorName: { $first: '$donorName' },
        phone: { $first: '$phone' },
        totalDonated: { $sum: '$amount' },
        donationCount: { $sum: 1 },
        firstDate: { $min: '$date' },
        lastDate: { $max: '$date' },
      },
    },
    {
      $project: {
        _id: 0,
        donorName: 1,
        phone: 1,
        totalDonated: 1,
        donationCount: 1,
        firstDate: 1,
        lastDate: 1,
      },
    },
    { $sort: sortObj }
  );

  const skip = (page - 1) * limit;

  const result = await Donation.aggregate([
    ...pipeline,
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: parseInt(limit) }],
      },
    },
  ]);

  const totalDonors = result[0].metadata[0]?.total || 0;
  const donors = result[0].data;

  return {
    donors,
    totalDonors,
    currentPage: parseInt(page),
    totalPages: Math.ceil(totalDonors / limit),
  };
};

/**
 * Quick check if a phone number belongs to a returning donor.
 * Returns { isReturning, previousCount, totalDonated } or null.
 */
export const checkReturningDonor = async (phone) => {
  const donations = await Donation.find({ phone })
    .select('amount')
    .lean();

  if (donations.length === 0) {
    return { isReturning: false, previousCount: 0, totalDonated: 0 };
  }

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);

  return {
    isReturning: true,
    previousCount: donations.length,
    totalDonated,
  };
};
