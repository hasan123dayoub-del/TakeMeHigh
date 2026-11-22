import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@demo.travelos.local' })
  @IsEmail()
  @MaxLength(190)
  email!: string;

  @ApiProperty({ example: 'see docs/DEMO.md' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
