import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

def send_password_reset_email(to_email: str, reset_token: str, username: str):
    try:
        if not SMTP_USER or not SMTP_PASSWORD:
            raise ValueError("SMTP credentials not configured")

        reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"

        message = MIMEMultipart("alternative")
        message["Subject"] = "FoodFeed - Password Reset Request"
        message["From"] = SMTP_USER
        message["To"] = to_email

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #228be6;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f8f9fa;
                    padding: 30px;
                    border-radius: 0 0 5px 5px;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: #228be6;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{
                    margin-top: 20px;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>FoodFeed</h1>
                </div>
                <div class="content">
                    <h2>Password Reset Request</h2>
                    <p>Hello {username},</p>
                    <p>We received a request to reset the password for your FoodFeed account.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="button">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #228be6;">{reset_url}</p>
                    <p><strong>This link will expire in 1 hour.</strong></p>
                    <p>If you didn't request a password reset, you can safely ignore this email.</p>
                    <div class="footer">
                        <p>© 2025 FoodFeed. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        FoodFeed - Password Reset Request
        
        Hello {username},
        
        We received a request to reset the password for your FoodFeed account.
        
        Click this link to reset your password:
        {reset_url}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, you can safely ignore this email.
        
        © 2025 FoodFeed. All rights reserved.
        """
        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        message.attach(part1)
        message.attach(part2)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        
        print(f"Password reset email sent successfully to {to_email}")
        return {"success": True, "message": "Password reset email sent successfully"}
        
    except Exception as e:
        print(f"Error sending password reset email: {str(e)}")
        return {"success": False, "error": str(e)}

def send_verification_email(to_email: str, verification_code: str, username: str):
    try:
        if not SMTP_USER or not SMTP_PASSWORD:
            raise ValueError("SMTP credentials not configured")

        message = MIMEMultipart("alternative")
        message["Subject"] = "FoodFeed - Email Verification Code"
        message["From"] = SMTP_USER
        message["To"] = to_email

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #228be6;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f8f9fa;
                    padding: 30px;
                    border-radius: 0 0 5px 5px;
                }}
                .code-box {{
                    background-color: white;
                    border: 2px dashed #228be6;
                    padding: 20px;
                    text-align: center;
                    margin: 20px 0;
                    border-radius: 5px;
                }}
                .code {{
                    font-size: 32px;
                    font-weight: bold;
                    color: #228be6;
                    letter-spacing: 8px;
                }}
                .footer {{
                    margin-top: 20px;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>FoodFeed</h1>
                </div>
                <div class="content">
                    <h2>Welcome to FoodFeed!</h2>
                    <p>Hello {username},</p>
                    <p>Thank you for signing up! To complete your registration, please enter the verification code below:</p>
                    <div class="code-box">
                        <div class="code">{verification_code}</div>
                    </div>
                    <p><strong>This code will expire in 15 minutes.</strong></p>
                    <p>If you didn't request this code, you can safely ignore this email.</p>
                    <div class="footer">
                        <p>© 2025 FoodFeed. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        FoodFeed - Email Verification Code
        
        Hello {username},
        
        Thank you for signing up! To complete your registration, please enter the verification code below:
        
        Verification Code: {verification_code}
        
        This code will expire in 15 minutes.
        
        If you didn't request this code, you can safely ignore this email.
        
        © 2025 FoodFeed. All rights reserved.
        """

        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        message.attach(part1)
        message.attach(part2)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        
        print(f"Verification email sent successfully to {to_email}")
        return {"success": True, "message": "Verification email sent successfully"}
        
    except Exception as e:
        print(f"Error sending verification email: {str(e)}")
        return {"success": False, "error": str(e)}

def send_mfa_code_email(to_email: str, mfa_code: str, username: str):
    try:
        if not SMTP_USER or not SMTP_PASSWORD:
            raise ValueError("SMTP credentials not configured")

        message = MIMEMultipart("alternative")
        message["Subject"] = "FoodFeed - Login Verification Code"
        message["From"] = SMTP_USER
        message["To"] = to_email

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #228be6;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f8f9fa;
                    padding: 30px;
                    border-radius: 0 0 5px 5px;
                }}
                .code-box {{
                    background-color: white;
                    border: 2px solid #228be6;
                    padding: 20px;
                    text-align: center;
                    margin: 20px 0;
                    border-radius: 5px;
                    box-shadow: 0 2px 8px rgba(34, 139, 230, 0.2);
                }}
                .code {{
                    font-size: 36px;
                    font-weight: bold;
                    color: #228be6;
                    letter-spacing: 10px;
                }}
                .footer {{
                    margin-top: 20px;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 10px;
                    margin: 15px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 FoodFeed</h1>
                </div>
                <div class="content">
                    <h2>Login Verification Code</h2>
                    <p>Hello {username},</p>
                    <p>Someone is attempting to log in to your FoodFeed account. To complete the login, please enter the verification code below:</p>
                    <div class="code-box">
                        <div class="code">{mfa_code}</div>
                    </div>
                    <p><strong>This code will expire in 10 minutes.</strong></p>
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong> If you didn't attempt to log in, please ignore this email and consider changing your password.
                    </div>
                    <div class="footer">
                        <p>© 2025 FoodFeed. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        FoodFeed - Login Verification Code
        
        Hello {username},
        
        Someone is attempting to log in to your FoodFeed account. To complete the login, please enter the verification code below:
        
        Verification Code: {mfa_code}
        
        This code will expire in 10 minutes.
        
        ⚠️ Security Notice: If you didn't attempt to log in, please ignore this email and consider changing your password.
        
        © 2025 FoodFeed. All rights reserved.
        """

        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        message.attach(part1)
        message.attach(part2)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        
        print(f"MFA code email sent successfully to {to_email}")
        return {"success": True, "message": "MFA code email sent successfully"}
        
    except Exception as e:
        print(f"Error sending MFA code email: {str(e)}")
        return {"success": False, "error": str(e)}
