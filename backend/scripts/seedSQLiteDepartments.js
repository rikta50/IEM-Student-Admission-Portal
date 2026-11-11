
const { sequelize, connectSQLite } = require('../config/database');
const { Department } = require('../models/sqlite');

// Official programme catalogue arranged by campus.
// Intake capacity is NULL until confirmed from an official source.

const departments = [
  // ==========================================
  // IEM SALT LAKE
  // ==========================================

  {
    code: 'CSE',
    name: 'Computer Science & Engineering',
    campus: 'Salt Lake',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'CSE-AIML',
    name: 'Computer Science & Engineering (AI & ML)',
    campus: 'Salt Lake',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'IT',
    name: 'Information Technology',
    campus: 'Salt Lake',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'ECE',
    name: 'Electronics & Communication Engineering',
    campus: 'Salt Lake',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'ME',
    name: 'Mechanical Engineering',
    campus: 'Salt Lake',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'EE',
    name: 'Electrical Engineering',
    campus: 'Salt Lake',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'BBA',
    name: 'Bachelor of Business Administration',
    campus: 'Salt Lake',
    degree: 'BBA',
    programmeLevel: 'UG'
  },
  {
    code: 'BCA',
    name: 'Bachelor of Computer Applications',
    campus: 'Salt Lake',
    degree: 'BCA',
    programmeLevel: 'UG'
  },
  {
    code: 'BBALLB',
    name: 'BBA LLB - Bachelor of Law',
    campus: 'Salt Lake',
    degree: 'BBA LLB',
    programmeLevel: 'Integrated'
  },
  {
    code: 'BHMCT',
    name: 'Bachelor of Hotel Management and Catering Technology',
    campus: 'Salt Lake',
    degree: 'BHMCT',
    programmeLevel: 'UG'
  },
  {
    code: 'BHHA',
    name: 'B.Sc in Hospitality & Hotel Administration',
    campus: 'Salt Lake',
    degree: 'B.Sc',
    programmeLevel: 'UG'
  },
  {
    code: 'MTECH-CSE',
    name: 'M.Tech - Computer Science & Engineering',
    campus: 'Salt Lake',
    degree: 'M.Tech',
    programmeLevel: 'PG'
  },
  {
    code: 'MTECH-AIML',
    name: 'M.Tech - CSE (AI & ML)',
    campus: 'Salt Lake',
    degree: 'M.Tech',
    programmeLevel: 'PG'
  },
  {
    code: 'MTECH-ECE',
    name: 'M.Tech - Electronics & Communication Engineering',
    campus: 'Salt Lake',
    degree: 'M.Tech',
    programmeLevel: 'PG'
  },
  {
    code: 'MBA-MKT',
    name: 'MBA - Marketing',
    campus: 'Salt Lake',
    degree: 'MBA',
    programmeLevel: 'PG'
  },
  {
    code: 'MBA-FIN',
    name: 'MBA - Finance',
    campus: 'Salt Lake',
    degree: 'MBA',
    programmeLevel: 'PG'
  },
  {
    code: 'MBA-HRM',
    name: 'MBA - Human Resource Management',
    campus: 'Salt Lake',
    degree: 'MBA',
    programmeLevel: 'PG'
  },
  {
    code: 'MBA-TM',
    name: 'MBA - Technology Management',
    campus: 'Salt Lake',
    degree: 'MBA',
    programmeLevel: 'PG'
  },
  {
    code: 'MBA-OSC',
    name: 'MBA - Operations & Supply Chain Management',
    campus: 'Salt Lake',
    degree: 'MBA',
    programmeLevel: 'PG'
  },
  {
    code: 'MBA-EFB',
    name: 'MBA - Entrepreneurship & Family Business',
    campus: 'Salt Lake',
    degree: 'MBA',
    programmeLevel: 'PG'
  },

  // ==========================================
  // IEM NEW TOWN
  // ==========================================

  {
    code: 'CSE-AI',
    name: 'Computer Science & Engineering (Artificial Intelligence)',
    campus: 'New Town',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'CSE-IOT-CSBT',
    name: 'CSE - IoT, Cyber Security & Blockchain Technology',
    campus: 'New Town',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'CSE-IOT',
    name: 'CSE - Internet of Things',
    campus: 'New Town',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'CSE-CS',
    name: 'CSE - Cyber Security',
    campus: 'New Town',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'CSE-DS',
    name: 'CSE - Data Science',
    campus: 'New Town',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'CSE-AIDS',
    name: 'CSE - Artificial Intelligence & Data Science',
    campus: 'New Town',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'BT',
    name: 'Biotechnology',
    campus: 'New Town',
    degree: 'B.Tech',
    programmeLevel: 'UG'
  },
  {
    code: 'MCA',
    name: 'Master of Computer Applications',
    campus: 'New Town',
    degree: 'MCA',
    programmeLevel: 'PG'
  }
];

async function seedDepartments() {
  try {
    console.log('\n======================================');
    console.log(' IEM ADMISSION PORTAL - DEPARTMENT SEED');
    console.log('======================================\n');

    await connectSQLite();

    console.log(`Total programmes to process: ${departments.length}\n`);

    let createdCount = 0;
    let existingCount = 0;

    for (const department of departments) {
      const [record, created] = await Department.findOrCreate({
        where: { code: department.code },
        defaults: {
          ...department,
          intakeCapacity: null,
          isActive: true
        }
      });

      if (created) {
        createdCount++;
        console.log(`[CREATED] ${record.code} - ${record.name}`);
      } else {
        existingCount++;
        console.log(`[EXISTS]  ${record.code} - ${record.name}`);
      }
    }

    const allDepartments = await Department.findAll({
      order: [
        ['campus', 'ASC'],
        ['name', 'ASC']
      ]
    });

    console.log('\n======================================');
    console.log(' SEEDING SUMMARY');
    console.log('======================================');
    console.log('New programmes created:', createdCount);
    console.log('Already existing:', existingCount);
    console.log('Total database records:', allDepartments.length);

    console.log('\nProgrammes by campus:');

    for (const campus of ['Salt Lake', 'New Town']) {
      const campusDepartments = allDepartments.filter(
        item => item.campus === campus
      );

      console.log(`\n${campus}: ${campusDepartments.length} programmes`);

      campusDepartments.forEach((item, index) => {
        console.log(
          `${index + 1}. ${item.code} | ${item.name} | ${item.degree}`
        );
      });
    }

    console.log('\nDepartment seeding completed successfully!');
  } catch (error) {
    console.error('\nDepartment seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seedDepartments();
