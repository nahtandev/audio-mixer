import { InjectQueue } from "@nestjs/bull";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bull";
import {} from "fs";
import { mkdir, readdir, rm } from "fs/promises";
import { join } from "path";
import {
  finalListDir,
  mainListDir,
  mainTempDir,
  secondListDir,
} from "./context";
import { isAccessiblePathSync } from "./helper";

@Injectable()
export class AppService {
  private logger: Logger;
  private secondListMedia: { name: string; path: string }[];
  private secondListPosition = 0;

  constructor(
    @InjectQueue("audio-processor") private readonly audioTasksQueue: Queue
  ) {
    this.logger = new Logger(AppService.name);
    this.secondListMedia = [];
    this.#initSecondListMedia().then(() =>
      this.logger.verbose("Second List Initialized")
    );
  }

  async getMainList() {
    const mainList = await readdir(mainListDir);
    return mainList;
  }

  async getSecondList() {
    const secondList = await readdir(secondListDir);
    return secondList;
  }

  async resetAllTask() {
    await this.audioTasksQueue.empty();
    await rm(finalListDir, { recursive: true, force: true });
    await rm(mainTempDir, { recursive: true, force: true });
    await mkdir(finalListDir);
    await mkdir(mainTempDir);
  }

  async startAudioMerge() {
    const mergeTasks = await readdir(mainTempDir);
    for (const taskDir of mergeTasks) {
      const files = await readdir(join(mainTempDir, taskDir));
      files.sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        return numA - numB;
      });

      const filesPath = files.map((file) => join(mainTempDir, taskDir, file));
      const outputFileName = `${taskDir}.mp3`;
      await this.audioTasksQueue.add("merge", {
        outputDir: finalListDir,
        outputFileName,
        files: filesPath,
      });
    }
  }

  async prepareAudioFile() {
    const mainList = await this.getMainList();

    for (const mainAudioDir of mainList) {
      this.logger.verbose(`Start prepare ${mainAudioDir}`);

      const listDir = join(mainListDir, mainAudioDir);
      const files = await readdir(listDir);
      const audioFilesPath = files.map((file) => join(listDir, file));
      const filesToMerge: string[] = [];
      let position = 0;

      // TODO: Improve ordering algorithm
      while (position <= audioFilesPath.length - 1) {
        if (audioFilesPath.length - position <= 1) {
          const isFirstElement = audioFilesPath.length === 1;
          const media1 = isFirstElement
            ? audioFilesPath[0]
            : audioFilesPath[position];
          const secondMedia = await this.#getNextSecondListMedia();
          filesToMerge.push(media1, secondMedia.path);
          position += 1;
        } else {
          const media1 = audioFilesPath[position];
          const media2 = audioFilesPath[position + 1];
          const secondMedia = await this.#getNextSecondListMedia();
          filesToMerge.push(media1, media2, secondMedia.path);
          position += 2;
        }
      }

      this.logger.verbose(`All files are ordered for => ${mainAudioDir}`);
      this.logger.log(filesToMerge);

      const tempDir = join(mainTempDir, mainAudioDir);
      if (!isAccessiblePathSync(tempDir)) await mkdir(tempDir);

      filesToMerge.forEach(async (file, index) => {
        await this.audioTasksQueue.add("prepare", {
          tempDir,
          originalFilePath: file,
          outputFileName: `${index}`,
        });
      });
    }
  }

  async #initSecondListMedia() {
    const secondList = await this.getSecondList();
    secondList.forEach(async (subList) => {
      const listDir = join(secondListDir, subList);
      const files = await readdir(listDir);
      files.map((file) => {
        this.secondListMedia.push({
          name: file,
          path: join(listDir, file),
        });
      });
    });
    return this.secondListMedia;
  }

  async #getNextSecondListMedia() {
    if (this.secondListMedia.length - 1 === this.secondListPosition) {
      this.secondListPosition = 0;
    }
    return this.secondListMedia[this.secondListPosition++];
  }
}
