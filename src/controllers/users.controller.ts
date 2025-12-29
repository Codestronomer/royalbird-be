// src/controllers/user.controller.ts
import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Authorized,
  CurrentUser,
  HttpCode,
  BadRequestError,
  NotFoundError,
  ForbiddenError
} from 'routing-controllers';
import { Service } from 'typedi';
import { User } from '../models/user.model';
import { 
  UserRegistrationDto, 
  UserLoginDto, 
  UserUpdateDto,
  PasswordChangeDto,
  EmailChangeDto 
} from '../types/users';

@Service()
@JsonController('/users')
export class UserController {
  
  @Post('/register')
  @HttpCode(201)
  async register(@Body() body: UserRegistrationDto) {
    const { email, username, password, firstName, lastName, agreeToTerms } = body;
    
    // Validate
    if (!agreeToTerms) {
      throw new BadRequestError('You must agree to the terms of service');
    }
    
    // Check if email/username already exists
    const [emailExists, usernameExists] = await Promise.all([
      User.isEmailTaken(email),
      User.isUsernameTaken(username)
    ]);
    
    if (emailExists) throw new BadRequestError('Email already registered');
    if (usernameExists) throw new BadRequestError('Username already taken');
    
    // Create user
    const user = await User.create({
      email,
      username,
      password,
      firstName,
      lastName,
      status: 'active'
    });
    
    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();
    
    // Send verification email (implement email service)
    // await sendVerificationEmail(user.email, verificationToken);
    
    // Generate auth token
    const token = user.generateAuthToken();
    
    return {
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        user: user.toJSON(),
        token
      }
    };
  }
  
  @Post('/login')
  @HttpCode(200)
  async login(@Body() body: UserLoginDto) {
    const { email, password } = body;
    
    // Find user
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
    if (!user) {
      throw new BadRequestError('Invalid credentials');
    }
    
    // Check if account is locked
    if (user.isLocked()) {
      throw new ForbiddenError('Account is temporarily locked. Try again later.');
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw new BadRequestError('Invalid credentials');
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      throw new ForbiddenError('Please verify your email before logging in');
    }
    
    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    await user.updateLastLogin();
    
    // Generate token
    const token = user.generateAuthToken();
    
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token
      }
    };
  }
  
  @Get('/profile')
  @Authorized()
  async getProfile(@CurrentUser() user: any) {
    const fullUser = await User.findById(user.id);
    if (!fullUser) throw new NotFoundError('User not found');
    
    return {
      success: true,
      data: fullUser.toJSON()
    };
  }
  
  @Put('/profile')
  @Authorized()
  async updateProfile(@CurrentUser() user: any, @Body() body: UserUpdateDto) {
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $set: body },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) throw new NotFoundError('User not found');
    
    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser.toJSON()
    };
  }
  
  @Post('/verify-email/:token')
  @HttpCode(200)
  async verifyEmail(@Param('token') token: string) {
    const user = await User.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestError('Invalid or expired verification token');
    }
    
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    
    return {
      success: true,
      message: 'Email verified successfully'
    };
  }
  
  @Post('/forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() body: { email: string }) {
    const user = await User.findOne({ email: body.email });
    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: 'If an account exists with that email, you will receive a password reset link'
      };
    }
    
    const resetToken = user.generatePasswordResetToken();
    await user.save();
    
    // Send password reset email
    // await sendPasswordResetEmail(user.email, resetToken);
    
    return {
      success: true,
      message: 'Password reset link sent to your email'
    };
  }
  
  @Post('/reset-password/:token')
  @HttpCode(200)
  async resetPassword(
    @Param('token') token: string,
    @Body() body: { password: string, confirmPassword: string }
  ) {
    if (body.password !== body.confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }
    
    const user = await User.findByPasswordResetToken(token);
    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }
    
    user.password = body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.lastPasswordChange = new Date();
    await user.save();
    
    return {
      success: true,
      message: 'Password reset successful'
    };
  }
}