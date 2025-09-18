import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ConfigService } from '@libs/config/config.service';

import { CreateKeyDto, KeyResponseDto } from './dto';
import { KeysEntity } from './entities/keys.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    private readonly config: ConfigService,
  ) {}

  async createKey(createKeyDto: CreateKeyDto): Promise<KeyResponseDto> {
    const generatedSecret = crypto.randomBytes(32).toString('base64url');

    const hashedSecret = await bcrypt.hash(generatedSecret, this.config.authSaltRounds);

    const key = this.keysRepository.create({
      secret: hashedSecret,
    });

    const savedKey = await this.keysRepository.save(key);

    return {
      id: savedKey.id,
      secret: generatedSecret,
      createdAt: savedKey.createdAt,
      updatedAt: savedKey.updatedAt,
    };
  }

  async deleteKey(id: string): Promise<void> {
    const key = await this.keysRepository.findOne({
      where: { id },
    });

    if (!key) {
      throw new NotFoundException('Key not found');
    }

    await this.keysRepository.softDelete(id);
  }
}
