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
export const getAllDonations = async (searchQuery) => {
  let filter = {};

  if (searchQuery && searchQuery.trim().length > 0) {
    const regex = new RegExp(searchQuery.trim(), 'i');
    filter = {
      $or: [
        { donorName: { $regex: regex } },
        { phone: { $regex: regex } },
      ],
    };
  }

  return await Donation.find(filter).sort({ date: -1, createdAt: -1 });
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
    .select('donorName phone amount date note')
    .lean();
};
