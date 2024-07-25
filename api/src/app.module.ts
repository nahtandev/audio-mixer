import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AudioProcessor } from "./audio-processor";
import { toNumberValue, toStringValue } from "./helper";

require("dotenv").config();

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: toStringValue(process.env.REDIS_HOST),
        port: toNumberValue(process.env.REDIS_PORT),
        password: toStringValue(process.env.REDIS_PASSWORD),
      },
      prefix: "bull",
    }),

    BullModule.registerQueue({
      name: "audio-processor",
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AudioProcessor],
})
export class AppModule {}
