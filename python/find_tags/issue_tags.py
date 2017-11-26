from xml.etree import cElementTree as ET
import sys

def find_tags(string):
	xmlstr = open('../python/find_tags/Tags.xml').read()
	tags=list()
	root = ET.fromstring(xmlstr)
	for row in list(root):
		tags.append(row.get('TagName'))
	results=list()
	string_list = list()
	for word in string.split():
		string_list.append(word.lower())
	for word in set(tags).intersection(string_list):
		results.append(word)
	return results

def main():
	string = sys.argv[1]
	tags = find_tags(string)
	print(tags)
	sys.stdout.flush()

if __name__ == '__main__':
    main()
