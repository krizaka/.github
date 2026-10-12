import unittest
from unittest.mock import patch
import requests

class GitHubSponsorsTest(unittest.TestCase):
    @patch('requests.get')
    def test_get_sponsors_success(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {'sponsors': ['user1', 'user2']}
        
        def get_sponsors(url):
            response = requests.get(url)
            if response.status_code == 200:
                return response.json().get('sponsors', [])
            return []
        
        sponsors = get_sponsors('https://api.github.com/sponsors')
        
        self.assertEqual(sponsors, ['user1', 'user2'])
        mock_get.assert_called_once_with('https://api.github.com/sponsors')

    @patch('requests.get')
    def test_get_sponsors_failure(self, mock_get):
        mock_get.return_value.status_code = 404
        
        def get_sponsors(url):
            response = requests.get(url)
            if response.status_code == 200:
                return response.json().get('sponsors', [])
            return []
        
        sponsors = get_sponsors('https://api.github.com/sponsors')
        
        self.assertEqual(sponsors, [])
        mock_get.assert_called_once_with('https://api.github.com/sponsors')

if __name__ == '__main__':
    unittest.main()