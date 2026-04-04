import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Barangay from "../services/barangayServices.js";
import User from "../services/userServices.js";
import { sendEmail } from "../utils/email.js";
import SetupTokenService from "../services/setupTokenService.js";

export const upsertBarangay = async (req, res, next) => {
  let {
    municipalityId,
    barangayName,
    barangayCode,
    contactNumber,
    email,
    gisCode,
    removeBarangayLogoPath,
    removeCertificateBackgroundPath,
    removeOrganizationalChartPath,
  } = req.body;

  // Parse municipalityId as integer if it's provided
  if (municipalityId) {
    municipalityId = parseInt(municipalityId);
  }
  const { barangayId } = req.params;

  // If municipalityId is not provided in the body, we need to get it from the existing barangay
  if (!municipalityId && barangayId) {
    // For updates, get the municipality_id from the existing barangay
    const currentBarangay = await Barangay.barangayInfo(barangayId);
    municipalityId = currentBarangay.municipality_id;
  } else if (!municipalityId) {
    // For new barangays, use the user's target_id (assuming it's municipality_id for admin users)
    municipalityId = req.user?.target_id;
  }

  let barangayLogoPath = req.files?.barangayLogoPath?.[0]?.path;
  let certificateBackgroundPath =
    req.files?.certificateBackgroundPath?.[0]?.path;
  let organizationalChartPath = req.files?.organizationalChartPath?.[0]?.path;

  try {
    // For new barangays, check for email conflicts before creating
    if (!barangayId && email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return next(new ApiError(409, `Email "${email}" is already in use. Please use a different email address.`));
      }
    }

    let result;

    if (!barangayId) {
      result = await Barangay.insertBarangay({
        municipalityId,
        barangayName,
        barangayCode,
        barangayLogoPath,
        certificateBackgroundPath,
        organizationalChartPath,
        contactNumber,
        email,
        gisCode: gisCode ? gisCode : null,
      });
    } else {
      // Fetch current barangay info to preserve file paths if not uploading new files
      const current = await Barangay.barangayInfo(barangayId);
      if (!barangayLogoPath) barangayLogoPath = current.barangay_logo_path;
      if (!certificateBackgroundPath)
        certificateBackgroundPath = current.certificate_background_path;
      if (!organizationalChartPath)
        organizationalChartPath = current.organizational_chart_path;
      result = await Barangay.updateBarangay({
        barangayId,
        municipalityId,
        barangayName,
        barangayCode,
        barangayLogoPath,
        certificateBackgroundPath,
        organizationalChartPath,
        contactNumber,
        email,
        gisCode: gisCode ? gisCode : null,
        removeBarangayLogoPath: removeBarangayLogoPath === "true",
        removeCertificateBackgroundPath: removeCertificateBackgroundPath === "true",
        removeOrganizationalChartPath: removeOrganizationalChartPath === "true",
      });
    }

    return res.status(200).json({
      message: "Successfully upserted barangay",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    // Handle duplicate barangay name error
    if (error.code === '23505' && error.constraint === 'barangays_barangay_name_key') {
      logger.error("Duplicate barangay name error: ", error.message);
      return next(new ApiError(409, `Barangay with name "${barangayName}" already exists. Please use a different name.`));
    }

    // Handle duplicate barangay code error
    if (error.code === '23505' && error.constraint === 'barangays_barangay_code_key') {
      logger.error("Duplicate barangay code error: ", error.message);
      return next(new ApiError(409, `Barangay with code "${barangayCode}" already exists. Please use a different code.`));
    }

    logger.error("Controller error in upsertBarangay: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const checkBarangayConflicts = async (req, res, next) => {
  try {
    const { barangayName, barangayCode, email } = req.query;
    const { barangayId } = req.params;
    
    if (!barangayName && !barangayCode && !email) {
      return next(new ApiError(400, "At least one of barangayName, barangayCode, or email is required"));
    }
    
    const barangayConflicts = await Barangay.checkForConflicts(
      barangayName || "",
      barangayCode || "",
      barangayId || null
    );
    
    const conflicts = [...barangayConflicts.conflicts];
    
    // Check for email conflicts if email is provided
    if (email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        conflicts.push({
          field: "email",
          message: `Email "${email}" is already in use`,
          existingId: existingUser.id
        });
      }
    }
    
    const result = {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
    
    return res.status(200).json({
      message: "Conflict check completed",
      data: result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in checkBarangayConflicts: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};



export const deleteBarangay = async (req, res, next) => {
  const { barangayId } = req.params;
  const { sendBackupEmail, adminEmail } = req.body;

  if (!barangayId) {
    logger.error("Missing required field barangayId");
    return next(new ApiError(400, "Missing required field barangayId"));
  }

  try {
    const barangay = await Barangay.barangayInfo(barangayId);
    if (!barangay) {
      return next(
        new ApiError(404, `Barangay with ID: ${barangayId} does not exist`)
      );
    }

         // If backup email is requested, create backup and send email
     if (sendBackupEmail && adminEmail) {
       try {
         logger.info(`Starting email backup process for barangay ${barangayId} to ${adminEmail}`);
         
         // Create backup data
         const backupData = await Barangay.createBackupData(barangayId);
         logger.info(`Backup data created: ${JSON.stringify(backupData)}`);
         
         // Export actual data files
         logger.info(`Starting residents export for barangay ${barangayId}`);
         let residentsExport;
         try {
           residentsExport = await Barangay.exportResidents(barangayId, {});
           logger.info(`Residents export completed, size: ${residentsExport.length} bytes`);
         } catch (exportError) {
           logger.error(`Failed to export residents: ${exportError.message}`);
           residentsExport = Buffer.from('Residents export failed');
         }
         
         logger.info(`Starting households export for barangay ${barangayId}`);
         let householdsExport;
         try {
           householdsExport = await Barangay.exportHouseholds(barangayId, {});
           logger.info(`Households export completed, size: ${householdsExport.length} bytes`);
         } catch (exportError) {
           logger.error(`Failed to export households: ${exportError.message}`);
           householdsExport = Buffer.from('Households export failed');
         }
         
         // Create attachments for email
         const attachments = [
           {
             filename: `residents-${barangay.barangay_name}-${new Date().toISOString().split('T')[0]}.xlsx`,
             content: residentsExport,
             contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
           },
           {
             filename: `households-${barangay.barangay_name}-${new Date().toISOString().split('T')[0]}.xlsx`,
             content: householdsExport,
             contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
           }
         ];
         
         logger.info(`Preparing to send email with ${attachments.length} attachments`);
         
         // Now send the full email with attachments
         await sendEmail({
           to: adminEmail,
           subject: `BIMS - Barangay Deletion Notice: ${barangay.barangay_name}`,
           attachments,
                       html: `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>BIMS - Barangay Deletion Notice</title>
                  <style>
                      body {
                          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                          line-height: 1.6;
                          color: #2c3e50;
                          margin: 0;
                          padding: 0;
                          background-color: #ecf0f1;
                      }
                      .container {
                          max-width: 600px;
                          margin: 0 auto;
                          background-color: #ffffff;
                          border-radius: 8px;
                          overflow: hidden;
                          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                      }
                      .header {
                          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                          padding: 30px 25px;
                          text-align: center;
                          color: white;
                      }
                      .header h1 {
                          margin: 0;
                          font-size: 26px;
                          font-weight: 600;
                          letter-spacing: -0.5px;
                      }
                      .header p {
                          margin: 8px 0 0 0;
                          font-size: 14px;
                          opacity: 0.9;
                      }
                      .content {
                          padding: 30px 25px;
                      }
                      .notice-box {
                          background-color: #fff3cd;
                          border: 1px solid #ffeaa7;
                          border-radius: 6px;
                          padding: 18px;
                          margin: 20px 0;
                      }
                      .notice-box h3 {
                          color: #856404;
                          margin: 0 0 8px 0;
                          font-size: 16px;
                      }
                      .notice-box p {
                          color: #856404;
                          margin: 0;
                          font-size: 14px;
                      }
                      .data-summary {
                          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                          border: 1px solid #dee2e6;
                          border-radius: 8px;
                          padding: 20px;
                          margin: 20px 0;
                      }
                      .data-summary h3 {
                          color: #495057;
                          font-size: 18px;
                          font-weight: 600;
                          margin: 0 0 15px 0;
                          text-align: center;
                      }
                      .stats-grid {
                          display: grid;
                          grid-template-columns: repeat(3, 1fr);
                          gap: 12px;
                          margin-bottom: 15px;
                      }
                      .stat-item {
                          text-align: center;
                          padding: 12px;
                          background-color: white;
                          border-radius: 6px;
                          border: 1px solid #dee2e6;
                      }
                      .stat-number {
                          font-size: 20px;
                          font-weight: 700;
                          color: #3498db;
                          margin-bottom: 4px;
                      }
                      .stat-label {
                          font-size: 11px;
                          color: #6c757d;
                          text-transform: uppercase;
                          letter-spacing: 0.5px;
                      }
                      .barangay-info {
                          background-color: #f8f9fa;
                          border: 1px solid #dee2e6;
                          border-radius: 6px;
                          padding: 15px;
                          margin: 15px 0;
                      }
                      .info-row {
                          display: flex;
                          justify-content: space-between;
                          margin-bottom: 8px;
                          padding-bottom: 8px;
                          border-bottom: 1px solid #dee2e6;
                      }
                      .info-row:last-child {
                          border-bottom: none;
                          margin-bottom: 0;
                      }
                      .info-label {
                          font-weight: 600;
                          color: #495057;
                      }
                      .info-value {
                          color: #6c757d;
                      }
                      .footer {
                          background-color: #f8f9fa;
                          padding: 20px;
                          text-align: center;
                          border-top: 1px solid #dee2e6;
                      }
                      .footer p {
                          color: #6c757d;
                          font-size: 13px;
                          margin: 3px 0;
                      }
                      .contact-info {
                          background-color: #d1ecf1;
                          border: 1px solid #bee5eb;
                          border-radius: 6px;
                          padding: 12px;
                          margin: 15px 0;
                      }
                      .contact-info p {
                          color: #0c5460;
                          margin: 0;
                          font-size: 13px;
                          text-align: center;
                      }
                      .contact-info ul {
                          color: #0c5460;
                          margin: 8px 0;
                          padding-left: 20px;
                      }
                      .contact-info li {
                          margin: 2px 0;
                      }
                      @media (max-width: 600px) {
                          .container {
                              margin: 10px;
                              border-radius: 6px;
                          }
                          .header, .content, .footer {
                              padding: 15px;
                          }
                          .header h1 {
                              font-size: 22px;
                          }
                          .stats-grid {
                              grid-template-columns: 1fr;
                          }
                      }
                  </style>
              </head>
              <body>
                  <div class="container">
                      <div class="header">
                          <h1>Barangay Deletion Notice</h1>
                          <p>Barangay Information Management System (BIMS)</p>
                      </div>
                      
                      <div class="content">
                          <h2 style="color: #2c3e50; font-size: 20px; font-weight: 600; margin: 0 0 15px 0;">
                              Dear Barangay Administrator,
                          </h2>
                          
                          <p style="color: #6c757d; font-size: 15px; margin: 0 0 15px 0;">
                              This email serves as official notification that your barangay <strong>${barangay.barangay_name}</strong> has been permanently deleted from the Barangay Information Management System (BIMS).
                          </p>
                          
                          <div class="notice-box">
                              <h3>⚠️ Important Notice</h3>
                              <p>This action is irreversible. All barangay data has been permanently removed from the system. Please ensure you have saved any important information before proceeding.</p>
                          </div>
                          
                          <div class="data-summary">
                              <h3>📊 Data Summary</h3>
                              <div class="stats-grid">
                                  <div class="stat-item">
                                      <div class="stat-number">${backupData.households || 0}</div>
                                      <div class="stat-label">Households</div>
                                  </div>
                                  <div class="stat-item">
                                      <div class="stat-number">${backupData.residents || 0}</div>
                                      <div class="stat-label">Residents</div>
                                  </div>
                              </div>
                              
                              <div class="barangay-info">
                                  <div class="info-row">
                                      <span class="info-label">Barangay Name:</span>
                                      <span class="info-value">${barangay.barangay_name}</span>
                                  </div>
                                  <div class="info-row">
                                      <span class="info-label">Barangay Code:</span>
                                      <span class="info-value">${barangay.barangay_code}</span>
                                  </div>
                                  <div class="info-row">
                                      <span class="info-label">Deletion Date:</span>
                                      <span class="info-value">${new Date().toLocaleDateString('en-US', { 
                                          year: 'numeric', 
                                          month: 'long', 
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                      })}</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div class="contact-info">
                              <p><strong>📎 Data Backup Attached</strong></p>
                              <p>This email includes Excel files containing your complete barangay data:</p>
                              <ul>
                                  <li>Residents data export</li>
                                  <li>Households data export</li>
                              </ul>
                              <p><strong>Need Help?</strong> Contact your municipality administrator for data restoration or technical support.</p>
                          </div>
                          
                          <p style="color: #6c757d; font-size: 14px; margin: 15px 0;">
                              Thank you for using the Barangay Information Management System. We appreciate your service to the community.
                          </p>
                      </div>
                      
                      <div class="footer">
                          <p><strong>BIMS Team</strong></p>
                          <p>Barangay Information Management System</p>
                          <p>This is an automated notification. Please do not reply to this email.</p>
                      </div>
                  </div>
              </body>
              </html>
            `,
           text: `
             BIMS - Barangay Deletion Notice
             =================================
             
             Dear Barangay Administrator,
             
             This email serves as official notification that your barangay "${barangay.barangay_name}" has been permanently deleted from the Barangay Information Management System (BIMS).
             
             ⚠️  IMPORTANT NOTICE
             This action is irreversible. All barangay data has been permanently removed from the system.
             
             📊  DATA SUMMARY
             - Barangay Name: ${barangay.barangay_name}
             - Barangay Code: ${barangay.barangay_code}
             - Deletion Date: ${new Date().toLocaleDateString('en-US', { 
                 year: 'numeric', 
                 month: 'long', 
                 day: 'numeric',
                 hour: '2-digit',
                 minute: '2-digit'
             })}
             - Total Households: ${backupData.households || 0}
             - Total Residents: ${backupData.residents || 0}
              
              📎 DATA BACKUP ATTACHED
              This email includes Excel files containing your complete barangay data:
              - Residents data export
              - Households data export
              
              Need Help? Contact your municipality administrator for data restoration or technical support.
             
             Thank you for using the Barangay Information Management System.
             
             Best regards,
             BIMS Team
             
             This is an automated notification. Please do not reply to this email.
           `
         });
        
        logger.info(`Backup email sent to ${adminEmail} for barangay ${barangay.barangay_name}`);
      } catch (emailError) {
        logger.error("Failed to send backup email:", emailError);
        // Continue with deletion even if email fails
      }
    }

         const result = await Barangay.deleteBarangay(barangayId);

     // Delete all users associated with this barangay
     try {
       const barangayUsers = await User.getUsersByTarget('barangay', barangayId);
       for (const user of barangayUsers) {
         await User.deleteUser(user.id);
       }
       logger.info(`Deleted ${barangayUsers.length} users associated with barangay ${barangayId}`);
     } catch (userDeleteError) {
       logger.error("Failed to delete barangay users:", userDeleteError);
       // Continue even if user deletion fails
     }

     return res.status(200).json({
       message: "Barangay and associated users are successfully deleted",
       data: result,
     });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    logger.error("Controller error in deleteBarangay: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const barangayList = async (req, res, next) => {
  const { search, page, perPage } = req.query;

  try {
    const result = await Barangay.barangayList({ search, page, perPage });

    return res.status(200).json({
      message: "Successfully returned list",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    logger.error("Controller error in barangayList", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const barangayInfo = async (req, res, next) => {
  const { barangayId } = req.params;

  if (!barangayId) {
    logger.error("Missing Require field barangayId");
    return next(new ApiError(400, "Missing required baranayd"));
  }

  try {
    const result = await Barangay.barangayInfoWithCaptain(barangayId);

    return res.status(200).json({
      message: "Successfully fetch barangay information",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    logger.error("Controller error in barangayInfo:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const upsertOfficial = async (req, res, next) => {
  const {
    barangayId,
    residentId,
    position,
    committee,
    termStart,
    termEnd,
    responsibilities,
  } = req.body;
  const { officialId } = req.params;

  try {
    let result;

    if (!officialId) {
      result = await Barangay.insertOfficial({
        barangayId,
        residentId,
        position,
        committee,
        termStart,
        termEnd,
        responsibilities,
      });
    } else {
      result = await Barangay.updateOfficial({
        officialId,
        barangayId,
        residentId,
        position,
        committee,
        termStart,
        termEnd,
        responsibilities,
      });
    }

    return res.status(200).json({
      message: "Successfully upserted official",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    logger.error("Controller error in upsertOfficial:", error.message);
    return next(new ApiError(500, "Internal Server Error"));
  }
};

export const officialList = async (req, res, next) => {
  const { barangayId } = req.params;
  try {
    const result = await Barangay.officialList(barangayId);

    return res.status(200).json({
      message: "successfully fetch official list",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    logger.error("Controller error in officialList:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const officialInfo = async (req, res, next) => {
  const { officialId } = req.params;
  try {
    const result = await Barangay.officialInfo(officialId);

    return res.status(200).json({
      message: "Successfully fetch official information",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    logger.error("Controller error in officialInfo:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const deleteOfficial = async (req, res, next) => {
  const { officialId } = req.params;
  try {
    const result = await Barangay.deleteOfficial(officialId);

    return res.status(200).json({
      message: "Successfully deleted official",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    logger.error("Controller error in deleteOfficial:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const exportBarangayData = async (req, res, next) => {
  const { barangayId } = req.params;

  if (!barangayId) {
    logger.error("Missing required field barangayId");
    return next(new ApiError(400, "Missing required field barangayId"));
  }

  try {
    const result = await Barangay.exportBarangayData(barangayId);

    // Set headers for file download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="barangay-data-export-${
        new Date().toISOString().split("T")[0]
      }.zip"`
    );

    return res.status(200).send(result);
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    logger.error("Controller error in exportBarangayData:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const exportResidents = async (req, res, next) => {
  try {
    const { barangayId } = req.params;

    // Extract filters from query parameters
    const filters = {
      search: req.query.search,
      classificationType: req.query.classificationType,
    };

    const result = await Barangay.exportResidents(barangayId, filters);

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="residents-export-${
        new Date().toISOString().split("T")[0]
      }.xlsx"`
    );

    return res.send(result);
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in exportResidents:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const importResidents = async (req, res, next) => {
  const { barangayId } = req.params;
  const file = req.files?.file?.[0];

  if (!barangayId) {
    logger.error("Missing required field barangayId");
    return next(new ApiError(400, "Missing required field barangayId"));
  }

  if (!file) {
    logger.error("No file uploaded");
    return next(new ApiError(400, "No file uploaded"));
  }

  try {
    const result = await Barangay.importResidents(barangayId, file.path);

    return res.status(200).json({
      message: "Successfully imported residents",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    logger.error("Controller error in importResidents:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const exportHouseholds = async (req, res, next) => {
  try {
    const { barangayId } = req.params;

    // Extract filters from query parameters
    const filters = {
      search: req.query.search,
    };

    const result = await Barangay.exportHouseholds(barangayId, filters);

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="households-export-${
        new Date().toISOString().split("T")[0]
      }.xlsx"`
    );

    return res.send(result);
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in exportHouseholds:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const importHouseholds = async (req, res, next) => {
  const { barangayId } = req.params;
  const file = req.files?.file?.[0];

  if (!barangayId) {
    logger.error("Missing required field barangayId");
    return next(new ApiError(400, "Missing required field barangayId"));
  }

  if (!file) {
    logger.error("No file uploaded");
    return next(new ApiError(400, "No file uploaded"));
  }

  try {
    const result = await Barangay.importHouseholds(barangayId, file.path);

    return res.status(200).json({
      message: "Successfully imported households",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    logger.error("Controller error in importHouseholds:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

// Test email endpoint
export const testEmail = async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return next(new ApiError(400, "Email is required"));
  }

  try {
    logger.info(`Testing email functionality to ${email}`);
    
    // Test basic email
    await sendEmail({
      to: email,
      subject: "BIMS - Email Test",
      html: `
        <h2>Email Test</h2>
        <p>This is a test email to verify BIMS email functionality.</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>If you receive this email, the email system is working correctly.</p>
      `,
      text: `BIMS Email Test - Time: ${new Date().toISOString()}`
    });

    logger.info(`Test email sent successfully to ${email}`);
    
    // Test email with Excel attachment
    const XLSX = await import("xlsx");
    const workbook = XLSX.default.utils.book_new();
    const testSheet = XLSX.default.utils.aoa_to_sheet([
      ["BIMS Test Export"],
      ["Test Date: " + new Date().toLocaleDateString('en-US')],
      [""],
      ["Name", "Value"],
      ["Test 1", "Value 1"],
      ["Test 2", "Value 2"],
      ["Test 3", "Value 3"]
    ]);
    
    // Set column widths
    testSheet['!cols'] = [
      { width: 15 },
      { width: 15 }
    ];
    
    XLSX.default.utils.book_append_sheet(workbook, testSheet, "Test Data");
    
    const excelBuffer = XLSX.default.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      compression: true,
      bookSST: false,
      cellStyles: true
    });
    
    await sendEmail({
      to: email,
      subject: "BIMS - Email Test with Excel Attachment",
      html: `
        <h2>Email Test with Excel Attachment</h2>
        <p>This email includes a test Excel file to verify Excel attachment functionality.</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>The attached Excel file should open correctly in Excel or similar applications.</p>
      `,
      text: `BIMS Email Test with Excel Attachment - Time: ${new Date().toISOString()}`,
      attachments: [
        {
          filename: 'test-excel-file.xlsx',
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ]
    });

    logger.info(`Test email with Excel attachment sent successfully to ${email}`);
    
    return res.status(200).json({
      message: "Test emails sent successfully",
      data: { 
        email, 
        timestamp: new Date().toISOString(),
        tests: ['Basic email', 'Email with Excel attachment']
      }
    });
  } catch (error) {
    logger.error("Email test failed:", error.message);
    return next(new ApiError(500, `Email test failed: ${error.message}`));
  }
};

// Generate secure setup token for barangay admin
export const generateSetupToken = async (req, res, next) => {
  try {
    const { barangayId, barangayName, barangayCode, fullName, email } = req.body;
    
    // Validate required fields
    if (!barangayId || !barangayName || !barangayCode || !fullName || !email) {
      return next(new ApiError(400, "All fields are required for setup token generation"));
    }

    // Verify barangay exists
    const barangay = await Barangay.barangayInfo(barangayId);
    if (!barangay) {
      return next(new ApiError(404, "Barangay not found"));
    }

    // Generate secure setup link
    const baseUrl = process.env.CLIENT_URL || `http://localhost:5173`;
    
    const setupData = {
      barangayId,
      barangayName,
      barangayCode,
      fullName,
      email
    };

    const setupLink = SetupTokenService.generateSetupLink(setupData, baseUrl);
    
    logger.info(`Setup token generated for barangay ${barangayName} (${barangayCode})`);
    
    return res.status(200).json({
      message: "Setup token generated successfully",
      data: {
        setupLink,
        expiresIn: "48 hours"
      }
    });
  } catch (error) {
    logger.error("Setup token generation failed:", error.message);
    return next(new ApiError(500, `Setup token generation failed: ${error.message}`));
  }
};

// Validate setup token
export const validateSetupToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return next(new ApiError(400, "Setup token is required"));
    }

    // Validate token using SetupTokenService
    const setupData = SetupTokenService.validateSetupToken(token);
    
    logger.info(`Setup token validated for barangay ${setupData.barangayName} (${setupData.barangayCode})`);
    
    return res.status(200).json({
      message: "Setup token is valid",
      data: setupData
    });
  } catch (error) {
    logger.error("Setup token validation failed:", error.message);
    return next(new ApiError(401, `Setup token validation failed: ${error.message}`));
  }
};
