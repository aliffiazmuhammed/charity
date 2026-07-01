import { Donation } from '../models/Donation.js';

/**
 * Create a new donation entry.
 */
export const createDonation = async (donationData) => {
  const donation = new Donation(donationData);
  return await donation.save();
};

/**
 * Get all donations, newest first.
 * Supports optional search by donor name or phone number.
 */
export const getAllDonations = async ({ search, page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc' }) => {
  let filter = {};

  if (search && search.trim().length > 0) {
    const regex = new RegExp(search.trim(), 'i');
    filter = {
      $or: [
        { donorName: { $regex: regex } },
        { phone: { $regex: regex } },
        { careOf: { $regex: regex } },
      ],
    };
  }

  // Construct sort object
  const sortObj = {};
  sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
  // Always add a secondary sort by createdAt to ensure stable pagination
  if (sortBy !== 'createdAt') {
    sortObj['createdAt'] = -1;
  }

  const skip = (page - 1) * limit;

  const [donations, totalDonations] = await Promise.all([
    Donation.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit)),
    Donation.countDocuments(filter)
  ]);

  return {
    donations,
    totalDonations,
    currentPage: parseInt(page),
    totalPages: Math.ceil(totalDonations / limit)
  };
};

/**
 * Delete a single donation by its _id.
 */
export const deleteDonation = async (id) => {
  const deleted = await Donation.findByIdAndDelete(id);
  if (!deleted) {
    throw new Error('Donation not found');
  }
  return deleted;
};

/**
 * Get dashboard summary statistics using MongoDB aggregation.
 * Returns: totalRaised, donationCount, uniqueDonors, averageAmount
 */
export const getDashboardStats = async () => {
  const stats = await Donation.aggregate([
    {
      $group: {
        _id: null,
        totalRaised: { $sum: '$amount' },
        donationCount: { $sum: 1 },
        uniqueDonors: { $addToSet: '$phone' },
        averageAmount: { $avg: '$amount' },
      },
    },
    {
      $project: {
        _id: 0,
        totalRaised: 1,
        donationCount: 1,
        uniqueDonors: { $size: '$uniqueDonors' },
        averageAmount: { $round: ['$averageAmount', 2] },
      },
    },
  ]);

  // Return zeros if no donations exist yet
  if (stats.length === 0) {
    return {
      totalRaised: 0,
      donationCount: 0,
      uniqueDonors: 0,
      averageAmount: 0,
    };
  }

  return stats[0];
};

/**
 * Get all donations as plain objects for CSV export.
 */
export const getAllDonationsForExport = async () => {
  return await Donation.find()
    .sort({ date: -1 })
    .select('donorName phone amount date note careOf')
    .lean();
};

/**
 * Get care-of statistics: total amount, donation count, unique donors per care-of.
 */
export const getCareOfStats = async () => {
  return await Donation.aggregate([
    { $match: { careOf: { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: '$careOf',
        careOf: { $first: '$careOf' },
        totalAmount: { $sum: '$amount' },
        donationCount: { $sum: 1 },
        uniqueDonors: { $addToSet: '$phone' },
        lastDate: { $max: '$date' },
      },
    },
    {
      $project: {
        _id: 0,
        careOf: 1,
        totalAmount: 1,
        donationCount: 1,
        uniqueDonors: { $size: '$uniqueDonors' },
        lastDate: 1,
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};
