import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLog } from './entities/system-log.entity';
import { Config } from './entities/config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemLog, Config])],
  exports: [TypeOrmModule],
})
export class ConfigModule {}
