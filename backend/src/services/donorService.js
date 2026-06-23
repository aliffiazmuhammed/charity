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

/**
 * Get all unique donors grouped by phone, sorted by total donated (highest first).
 * Uses MongoDB aggregation pipeline.
 */
export const getAllDonors = async () => {
  return await Donation.aggregate([
    {
      $sort: { date: -1 },
    },
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
      $sort: { totalDonated: -1 },
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
  ]);
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
