from luma.core.interface.serial import i2c
from luma.core.render import canvas
from luma.oled.device import sh1106, ssd1306
from PIL import ImageFont, ImageDraw, Image
serial = i2c(port=1, address=0x3C)
device = sh1106(serial)

device.display(Image.new('1', (device.width, device.height)))
