import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from '../utils/logger.js';
import Faculty from '../Articles/models/faculty.model.js';
import Department from '../Articles/models/department.model.js';
import connectDB from '../db/database.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function populateFacultiesAndDepartments() {
  try {
    // Connect to the database first
    await connectDB();
    logger.info('Connected to database');

    const filePath = path.join(
      __dirname,
      './list_of_faculties_and_dept_in_uniben.md'
    );
    const data = fs.readFileSync(filePath, 'utf8');

    // Parse the markdown file
    const lines = data.split('\n');

    let currentFaculty = null;
    const faculties = [];
    const departments = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and headers
      if (
        !trimmedLine ||
        trimmedLine === 'Academic Section' ||
        trimmedLine === 'Faculties' ||
        trimmedLine === 'Code Title'
      ) {
        continue;
      }

      // Check for faculty pattern by looking for "Faculty of" or "School of" or "Institute of"
      if (
        trimmedLine.includes('Faculty of') ||
        trimmedLine.includes('School of') ||
        trimmedLine.includes('INSTITUTE OF') ||
        trimmedLine.includes('Institute of') ||
        trimmedLine.includes('Centre of')
      ) {
        const parts = trimmedLine.split(' ');
        const code = parts[0];
        const title = trimmedLine.substring(code.length + 1);

        currentFaculty = { code, title };
        faculties.push(currentFaculty);

        logger.debug(`Found faculty: ${code} - ${title}`);
        continue;
      }

      // Check for department line (starts with a code and has "Department of")
      if (
        trimmedLine.includes('Department of') &&
        trimmedLine.match(/\([A-Z]+\)$/) && // ends with code in parentheses
        currentFaculty // ensure we have a current faculty
      ) {
        const parts = trimmedLine.split(' ');
        const deptCode = trimmedLine.substring(
          trimmedLine.lastIndexOf('(') + 1,
          trimmedLine.lastIndexOf(')')
        );

        // Get the title between the department code and the parentheses code
        const title = trimmedLine.substring(
          parts[0].length + 1,
          trimmedLine.lastIndexOf('(') - 1
        );

        departments.push({
          code: deptCode,
          title,
          faculty: currentFaculty.code,
        });

        logger.debug(
          `Found department: ${deptCode} - ${title} in faculty ${currentFaculty.code}`
        );
      }
    }

    logger.info(
      `Found ${faculties.length} faculties and ${departments.length} departments to insert`
    );

    // Clear existing data before inserting
    await Faculty.deleteMany({});
    await Department.deleteMany({});
    logger.info('Cleared existing faculty and department data');

    // Save faculties to database
    if (faculties.length > 0) {
      const insertedFaculties = await Faculty.insertMany(
        faculties.map((f) => ({ code: f.code, title: f.title }))
      );
      logger.info(
        `Inserted ${insertedFaculties.length} faculties into the database`
      );
    }

    // Save departments to database
    if (departments.length > 0) {
      const insertedDepartments = await Department.insertMany(departments);
      logger.info(
        `Inserted ${insertedDepartments.length} departments into the database`
      );
    }

    logger.info(
      `Database populated with ${faculties.length} faculties and ${departments.length} departments`
    );

    return {
      facultiesCount: faculties.length,
      departmentsCount: departments.length,
    };
  } catch (error) {
    logger.error(`Error populating database: ${error.message}`);
    throw error;
  } finally {
    // Disconnect from the database
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('Disconnected from database');
    }
  }
}

// If this script is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  populateFacultiesAndDepartments()
    .then(() => {
      logger.info('Population script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Population script failed:', error);
      process.exit(1);
    });
}

export default populateFacultiesAndDepartments;
