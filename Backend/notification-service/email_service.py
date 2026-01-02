"""
Email Service for sending verification and password reset emails
Uses SMTP with STARTTLS for secure email delivery
"""
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

# Email configuration from environment variables
SMTP_HOST = os.getenv("SMTP_HOST", "mail.kashifroad.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "noreply@kashifroad.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "SecurePass123!")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@kashifroad.com")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Kashif Road")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

# Frontend URL for verification links
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://kashifroad.com")


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    plain_content: Optional[str] = None
) -> bool:
    """
    Send an email using SMTP with STARTTLS
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML body of the email
        plain_content: Optional plain text alternative
    
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        
        # Add plain text version (fallback)
        if plain_content:
            part1 = MIMEText(plain_content, "plain", "utf-8")
            msg.attach(part1)
        
        # Add HTML version
        part2 = MIMEText(html_content, "html", "utf-8")
        msg.attach(part2)
        
        # Connect to SMTP server and send
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_USE_TLS:
                server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending email to {to_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email to {to_email}: {e}")
        return False


def send_verification_email(
    to_email: str,
    full_name: str,
    verification_token: str,
    language: str = "ar"
) -> bool:
    """
    Send account verification email
    
    Args:
        to_email: User's email address
        full_name: User's full name
        verification_token: JWT token for verification
        language: User's preferred language (ar, de, en)
    
    Returns:
        True if email sent successfully
    """
    verification_link = f"{FRONTEND_URL}/verify?token={verification_token}"
    
    # Multi-language support
    if language == "de":
        subject = "Bestätigen Sie Ihr Kashif Road Konto"
        greeting = f"Hallo {full_name},"
        message = "Vielen Dank für Ihre Registrierung bei Kashif Road! Bitte klicken Sie auf den Button unten, um Ihr Konto zu bestätigen:"
        button_text = "Konto bestätigen"
        footer = "Wenn Sie sich nicht bei Kashif Road registriert haben, ignorieren Sie bitte diese E-Mail."
        expiry_note = "Dieser Link ist 24 Stunden gültig."
    elif language == "en":
        subject = "Verify Your Kashif Road Account"
        greeting = f"Hello {full_name},"
        message = "Thank you for registering with Kashif Road! Please click the button below to verify your account:"
        button_text = "Verify Account"
        footer = "If you did not register with Kashif Road, please ignore this email."
        expiry_note = "This link is valid for 24 hours."
    else:  # Arabic (default)
        subject = "تأكيد حسابك في Kashif Road"
        greeting = f"مرحباً {full_name}،"
        message = "شكراً لتسجيلك في Kashif Road! يرجى النقر على الزر أدناه لتأكيد حسابك:"
        button_text = "تأكيد الحساب"
        footer = "إذا لم تقم بالتسجيل في Kashif Road، يرجى تجاهل هذا البريد الإلكتروني."
        expiry_note = "هذا الرابط صالح لمدة 24 ساعة."
    
    html_content = f"""
    <!DOCTYPE html>
    <html dir="{'rtl' if language == 'ar' else 'ltr'}">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #4CAF50;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }}
            .content {{
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 8px 8px;
            }}
            .button {{
                display: inline-block;
                background-color: #4CAF50;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Kashif Road</h1>
        </div>
        <div class="content">
            <p>{greeting}</p>
            <p>{message}</p>
            <p style="text-align: center;">
                <a href="{verification_link}" class="button">{button_text}</a>
            </p>
            <p><small>{expiry_note}</small></p>
        </div>
        <div class="footer">
            <p>{footer}</p>
            <p>© 2024 Kashif Road. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    plain_content = f"{greeting}\n\n{message}\n\n{verification_link}\n\n{expiry_note}\n\n{footer}"
    
    return send_email(to_email, subject, html_content, plain_content)


def send_password_reset_email(
    to_email: str,
    full_name: str,
    reset_token: str,
    language: str = "ar"
) -> bool:
    """
    Send password reset email
    
    Args:
        to_email: User's email address
        full_name: User's full name
        reset_token: JWT token for password reset
        language: User's preferred language (ar, de, en)
    
    Returns:
        True if email sent successfully
    """
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Multi-language support
    if language == "de":
        subject = "Passwort zurücksetzen - Kashif Road"
        greeting = f"Hallo {full_name},"
        message = "Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den Button unten, um ein neues Passwort festzulegen:"
        button_text = "Passwort zurücksetzen"
        footer = "Wenn Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail. Ihr Passwort bleibt unverändert."
        expiry_note = "Dieser Link ist 1 Stunde gültig."
    elif language == "en":
        subject = "Reset Your Password - Kashif Road"
        greeting = f"Hello {full_name},"
        message = "You have requested to reset your password. Click the button below to set a new password:"
        button_text = "Reset Password"
        footer = "If you did not request this, please ignore this email. Your password will remain unchanged."
        expiry_note = "This link is valid for 1 hour."
    else:  # Arabic (default)
        subject = "إعادة تعيين كلمة المرور - Kashif Road"
        greeting = f"مرحباً {full_name}،"
        message = "لقد طلبت إعادة تعيين كلمة المرور الخاصة بك. انقر على الزر أدناه لتعيين كلمة مرور جديدة:"
        button_text = "إعادة تعيين كلمة المرور"
        footer = "إذا لم تطلب ذلك، يرجى تجاهل هذا البريد الإلكتروني. ستبقى كلمة المرور الخاصة بك دون تغيير."
        expiry_note = "هذا الرابط صالح لمدة ساعة واحدة."
    
    html_content = f"""
    <!DOCTYPE html>
    <html dir="{'rtl' if language == 'ar' else 'ltr'}">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #FF5722;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }}
            .content {{
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 8px 8px;
            }}
            .button {{
                display: inline-block;
                background-color: #FF5722;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
            }}
            .warning {{
                background-color: #fff3cd;
                border: 1px solid #ffc107;
                padding: 10px;
                border-radius: 5px;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Kashif Road</h1>
        </div>
        <div class="content">
            <p>{greeting}</p>
            <p>{message}</p>
            <p style="text-align: center;">
                <a href="{reset_link}" class="button">{button_text}</a>
            </p>
            <p><small>{expiry_note}</small></p>
            <div class="warning">
                <p>{footer}</p>
            </div>
        </div>
        <div class="footer">
            <p>© 2024 Kashif Road. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    plain_content = f"{greeting}\n\n{message}\n\n{reset_link}\n\n{expiry_note}\n\n{footer}"
    
    return send_email(to_email, subject, html_content, plain_content)


def send_verification_code_email(
    to_email: str,
    full_name: str,
    verification_code: str,
    language: str = "ar"
) -> bool:
    """
    Send verification code email (6-digit code)
    
    Args:
        to_email: User's email address
        full_name: User's full name
        verification_code: 6-digit verification code
        language: User's preferred language (ar, de, en)
    
    Returns:
        True if email sent successfully
    """
    # Multi-language support
    if language == "de":
        subject = "Ihr Bestätigungscode - Kashif Road"
        greeting = f"Hallo {full_name},"
        message = "Hier ist Ihr Bestätigungscode:"
        footer = "Dieser Code ist 10 Minuten gültig. Teilen Sie diesen Code mit niemandem."
    elif language == "en":
        subject = "Your Verification Code - Kashif Road"
        greeting = f"Hello {full_name},"
        message = "Here is your verification code:"
        footer = "This code is valid for 10 minutes. Do not share this code with anyone."
    else:  # Arabic (default)
        subject = "رمز التحقق الخاص بك - Kashif Road"
        greeting = f"مرحباً {full_name}،"
        message = "إليك رمز التحقق الخاص بك:"
        footer = "هذا الرمز صالح لمدة 10 دقائق. لا تشارك هذا الرمز مع أي شخص."
    
    html_content = f"""
    <!DOCTYPE html>
    <html dir="{'rtl' if language == 'ar' else 'ltr'}">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #2196F3;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }}
            .content {{
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 8px 8px;
            }}
            .code {{
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 10px;
                text-align: center;
                background-color: #e3f2fd;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                color: #1976D2;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Kashif Road</h1>
        </div>
        <div class="content">
            <p>{greeting}</p>
            <p>{message}</p>
            <div class="code">{verification_code}</div>
            <p><small>{footer}</small></p>
        </div>
        <div class="footer">
            <p>© 2024 Kashif Road. All rights reserved.</p>
        </div>
    </body>
    </html>
    """
    
    plain_content = f"{greeting}\n\n{message}\n\n{verification_code}\n\n{footer}"
    
    return send_email(to_email, subject, html_content, plain_content)
