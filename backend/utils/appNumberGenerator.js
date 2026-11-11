const { Op } = require('sequelize');
const { Application } = require('../models/sqlite');

/**
 * Generates application numbers in this format:
 * IEM-2026-0101
 */
const generateApplicationNumber = async (
  admissionCycle = '2026-2027'
) => {
  const year =
    admissionCycle.split('-')[0] ||
    new Date().getFullYear().toString();

  const prefix = `IEM-${year}-`;

  const lastApplication = await Application.findOne({
    where: {
      applicationNumber: {
        [Op.like]: `${prefix}%`
      }
    },
    attributes: ['applicationNumber'],
    order: [['applicationNumber', 'DESC']]
  });

  let nextSequence = 101;

  if (lastApplication && lastApplication.applicationNumber) {
    const parts = lastApplication.applicationNumber.split('-');
    const currentSequence = parseInt(parts[2], 10);

    if (!Number.isNaN(currentSequence)) {
      nextSequence = currentSequence + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
};

module.exports = {
  generateApplicationNumber
};