import { EventEmitter } from "events";
import gpio from "rpi-gpio";
const gpiop = gpio.promise;

export default class JEMATerminal extends EventEmitter {

  private readonly options: any;
  private currentValue: boolean = false;

  constructor(options: any) {
    super();
    this.options = options;
  }

  public async setup(): Promise<void> {
    gpio.setMode(gpio.MODE_BCM);
    await gpiop.setup(this.options.monitor.pin, gpio.DIR_IN, gpio.EDGE_BOTH);
    await gpiop.setup(this.options.control.pin, gpio.DIR_OUT, gpio.EDGE_NONE);

    gpio.on('change', this.onChange);

    this.currentValue = this.normalizeMonitorValue(await gpiop.read(this.options.monitor.pin));
  }

  private onChange(channel: any, value: any): void {
    if (channel == this.options.monitor.pin) {
      this.currentValue = this.normalizeMonitorValue(value);
      this.emit('change', this.currentValue);
    }
  }

  get value(): boolean {
    return this.currentValue;
  }

  public async get(): Promise<boolean> {
    return this.currentValue = this.normalizeMonitorValue(await gpiop.read(this.options.monitor.pin));
  }

  public async set(value: boolean): Promise<boolean> {
    const currentValue = this.normalizeMonitorValue(await gpiop.read(this.options.monitor.pin));
    if (currentValue != value) {
      await gpiop.write(this.options.control.pin, true);
      await this.sleep(this.options.control.duration);
      await gpiop.write(this.options.control.pin, false);
      this.currentValue = value;
    }
    return this.currentValue;
  }

  private normalizeMonitorValue(value: boolean): boolean {
    return this.options.monitor.inverted ? !value : !!value;
  }

  private sleep(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

}
