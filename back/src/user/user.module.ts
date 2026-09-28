import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RolService } from './rol.service';
import { RolController } from './rol.controller';
import { User } from './entities/user.entity';
import { Rol } from './entities/rol.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Rol])],
  controllers: [UserController, RolController],
  providers: [UserService, RolService],
  exports: [UserService, RolService, TypeOrmModule],
})
export class UserModule {}
