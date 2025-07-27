from rembg import remove
from PIL import Image
import cv2


def remove_background(image_path:str, output_path:str=None):
    if output_path is None:
        output_path = image_path.split(".")[0] + "_no_bg.png"
    input = Image.open(image_path)
    output = remove(input)
    output.save(output_path)

def remove_background_from_url(url:str):
    input = Image.open(url)
    output = remove(input)
    output.save(url)


