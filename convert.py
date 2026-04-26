import numpy as np
np.object = object
np.bool = bool
np.complex = complex
from tensorflowjs.converters import converter

if __name__ == '__main__':
    converter.setup_logging = lambda: None
    converter.main([
        '--input_format=keras', 
        r'C:\Users\HP ENVY 15\Downloads\New folder (2)\external_repos\Arabic-Sign-Language-Real-Time-Detection\gp_model.h5', 
        r'C:\Users\HP ENVY 15\Downloads\New folder (2)\frontend\public\models\sign_model'
    ])
