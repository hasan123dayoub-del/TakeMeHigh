import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  /** e.g. admin@sham-travel.safarni.local */
  @IsEmail()
  @MaxLength(190)
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  refreshToken!: string;
}
