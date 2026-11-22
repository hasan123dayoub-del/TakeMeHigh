import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class BookingRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @IsString()
  @Matches(/^[+\d][\d\s()-]{5,39}$/, { message: 'phone must be a valid phone number' })
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(190)
  email?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  adults!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  children?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
