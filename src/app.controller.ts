import { Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private appService: AppService) {}

  @Get("main")
  async getMainList() {
    return await this.appService.getMainList();
  }

  @Get("second")
  async getSecondList() {
    return await this.appService.getSecondList();
  }

  @Post("prepare")
  async prepare() {
    await this.appService.prepareAudioFile();
    return {
      message: "Audio merge prepared successfully",
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post("start")
  async startMerge() {
    await this.appService.startAudioMerge();
    return {
      message: "Audio merge started successfully",
    };
  }

  @Post("reset")
  async reset() {
    await this.appService.resetAllTask();
    return {
      message: "All tasks reset successfully",
    };
  }
}
