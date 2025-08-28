// Email service for sending verification notifications
// This would typically integrate with a service like SendGrid, Mailgun, or AWS SES

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const sendVerificationStatusEmail = async (
  userEmail: string,
  status: 'approved' | 'rejected',
  userRole: 'seller' | 'runner',
  notes?: string
): Promise<boolean> => {
  try {
    const subject = `NIN Verification ${status.charAt(0).toUpperCase() + status.slice(1)} - Airrrands`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #E89C31; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Airrrands</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #333;">NIN Verification ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Dear User,
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Your NIN verification for the ${userRole} role has been <strong>${status}</strong>.
          </p>
          
          ${status === 'approved' ? `
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #155724; margin: 0;">
                🎉 Congratulations! You can now start using the platform as a ${userRole}.
              </p>
            </div>
          ` : `
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #721c24; margin: 0;">
                ❌ Your verification was not approved. Please review the requirements and submit again.
              </p>
            </div>
          `}
          
          ${notes ? `
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="color: #856404; margin: 0 0 10px 0;">Review Notes:</h4>
              <p style="color: #856404; margin: 0; line-height: 1.6;">${notes}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            If you have any questions, please contact our support team.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Best regards,<br>
            The Airrrands Team
          </p>
        </div>
        
        <div style="background-color: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            © 2024 Airrrands. All rights reserved.
          </p>
        </div>
      </div>
    `;
    
    const text = `
      NIN Verification ${status.charAt(0).toUpperCase() + status.slice(1)} - Airrrands
      
      Dear User,
      
      Your NIN verification for the ${userRole} role has been ${status}.
      
      ${status === 'approved' ? 
        'Congratulations! You can now start using the platform as a ' + userRole + '.' :
        'Your verification was not approved. Please review the requirements and submit again.'
      }
      
      ${notes ? `Review Notes: ${notes}` : ''}
      
      If you have any questions, please contact our support team.
      
      Best regards,
      The Airrrands Team
    `;

    const emailData: EmailData = {
      to: userEmail,
      subject,
      html,
      text
    };

    // In a real implementation, you would send this via an email service
    // For now, we'll just log it to the console
    console.log('Email notification would be sent:', emailData);
    
    // TODO: Integrate with actual email service (SendGrid, Mailgun, AWS SES, etc.)
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send(emailData);
    
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
};

export const sendBulkVerificationNotifications = async (
  notifications: Array<{
    userEmail: string;
    status: 'approved' | 'rejected';
    userRole: 'seller' | 'runner';
    notes?: string;
  }>
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const notification of notifications) {
    const result = await sendVerificationStatusEmail(
      notification.userEmail,
      notification.status,
      notification.userRole,
      notification.notes
    );
    
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
};
