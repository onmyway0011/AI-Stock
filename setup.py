#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from setuptools import setup, find_packages
import os

# 读取README文件
def read_readme():
    with open("README.md", "r", encoding="utf-8") as f:
        return f.read()

# 读取requirements文件
def read_requirements():
    with open("requirements.txt", "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]

setup(
    name="ai-stock-trading-system",
    version="2.0.0",
    description="AI-powered stock trading system with intelligent signal generation and automated monitoring",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    author="AI Stock Trading Team",
    author_email="ai-stock@example.com",
    url="https://github.com/onmyway0011/AI-Stock",
    packages=find_packages(),
    include_package_data=True,
    python_requires=">=3.8",
    install_requires=read_requirements(),
    extras_require={
        "dev": [
            "pytest>=7.2.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
        ],
        "gui": [
            "tkinter",
            "PyQt5>=5.15.0",
        ],
        "ml": [
            "tensorflow>=2.10.0",
            "torch>=1.13.0",
            "xgboost>=1.7.0",
        ]
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Financial and Insurance Industry",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Office/Business :: Financial :: Investment",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    keywords=[
        "ai", "stock", "trading", "algorithmic", "quantitative",
        "machine-learning", "technical-analysis", "financial",
        "investment", "cryptocurrency", "backtesting", "signals"
    ],
    entry_points={
        "console_scripts": [
            "ai-stock=ai_stock.cli.main:main",
            "ai-stock-backtest=ai_stock.cli.backtest:main",
            "ai-stock-monitor=ai_stock.cli.monitor:main",
        ],
    },
    project_urls={
        "Bug Reports": "https://github.com/onmyway0011/AI-Stock/issues",
        "Documentation": "https://github.com/onmyway0011/AI-Stock/docs",
        "Source": "https://github.com/onmyway0011/AI-Stock",
    },
)