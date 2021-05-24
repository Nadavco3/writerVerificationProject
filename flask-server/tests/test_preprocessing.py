import unittest
import sys
sys.path.insert(0, 'C:/Users/nadav/Desktop/writer-verification-final-project/writerVerificationProject/flask-server')
from preprocessing import checkQuarters

class TestPreprocessing(unittest.TestCase):

    def test_checkQuarters(self):
        self.assertEqual(checkQuarters(True,True,False,True), True)
        self.assertEqual(checkQuarters(False,False,False,True),False)

if __name__ == '__main__':
    unittest.main()