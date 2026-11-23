import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  /** e.g. admin@takemehigh.local */
  @IsEmail()
  @MaxLength(190)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  refreshToken!: string;
}

/** AUTH-03: at least 10 characters, with a letter and a digit. */
export const PASSWORD_RULE = /^(?=.*[A-Za-z؀-ۿ])(?=.*\d).{10,128}$/;
export const PASSWORD_MESSAGE =
  'Password must be at least 10 characters and contain a letter and a digit';

export class ChangePasswordDto {
  @IsString()
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
